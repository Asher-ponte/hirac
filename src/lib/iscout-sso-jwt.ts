import {createHmac, timingSafeEqual} from 'node:crypto';
import type {IscoutSsoUserClaims} from './sso-helpers';

/**
 * Pure verification core for iScout portal SSO handoff tokens.
 * No value imports from app modules so it runs under `node --test` directly.
 * Never logs the token or its claims.
 */

/** Maximum lifetime (exp - iat) accepted for origin-bound tokens. */
export const SSO_MAX_TOKEN_TTL_SECONDS = 60;
/** Allowed clock skew between portal and this deployment. */
export const SSO_CLOCK_SKEW_SECONDS = 30;

const JTI_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export type SsoErrorCode =
  | 'invalid_token'
  | 'token_expired'
  | 'replayed_token'
  | 'sso_not_configured'
  | 'sso_unavailable'
  | 'verification_failed'
  | 'iscout_connection_failed'
  | 'rate_limited'
  | 'no_user';

export type SsoPolicy = {
  appId: string;
  issuer: string;
  /** Canonical origin from SSO_EXPECTED_AUD; null means misconfigured (fail closed). */
  expectedOrigin: string | null;
  /** SSO_ALLOW_LEGACY_AUD=1: accept pre-origin tokens (aud === appId, no jti). */
  allowLegacyAud: boolean;
  /** ISCOUT_JWT_SECRET, or null when only portal HTTP verify is available. */
  secret: string | null;
  /** ISCOUT_JWT_SECRET is set but too short; fail closed rather than fall back to portal verify. */
  secretInvalid?: boolean;
};

export const SSO_MIN_SECRET_LENGTH = 16;

export type SsoTokenClaims = {
  user: IscoutSsoUserClaims;
  jti: string | null;
  exp: number;
  legacy: boolean;
};

export type SsoResult<T> = {ok: true; value: T} | {ok: false; error: SsoErrorCode};

/**
 * One-time-use store for token ids. Implementations must be shared across all
 * instances of a deployment (no per-process memory on serverless).
 */
export interface SsoJtiStore {
  /** Atomically record `jti`. Resolves 'replayed' if it was already recorded. Throws on storage failure. */
  consume(jti: string, appId: string, expiresAtSec: number): Promise<'consumed' | 'replayed'>;
}

/** Normalise an origin string; returns null unless it is a bare http(s) origin. */
export function normalizeOrigin(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.origin !== trimmed.toLowerCase()) return null;
  return url.origin;
}

export function readSsoPolicyFromEnv(env: Record<string, string | undefined>, appId: string): SsoPolicy {
  const secret = (env.ISCOUT_JWT_SECRET || '').trim();
  return {
    appId,
    issuer: (env.JWT_ISSUER || '').trim() || 'iscout-sso',
    expectedOrigin: normalizeOrigin(env.SSO_EXPECTED_AUD),
    allowLegacyAud: (env.SSO_ALLOW_LEGACY_AUD || '').trim() === '1',
    secret: secret.length >= SSO_MIN_SECRET_LENGTH ? secret : null,
    secretInvalid: secret.length > 0 && secret.length < SSO_MIN_SECRET_LENGTH,
  };
}

function decodeB64urlStrict(part: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]*$/.test(part)) return null;
  const buf = Buffer.from(part, 'base64url');
  // Reject non-canonical encodings so a signature has exactly one valid form.
  if (buf.toString('base64url') !== part) return null;
  return buf;
}

function decodeJsonPart(part: string): Record<string, unknown> | null {
  const buf = decodeB64urlStrict(part);
  if (!buf) return null;
  try {
    const value = JSON.parse(buf.toString('utf8')) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

type ParsedToken = {
  signingInput: string;
  signature: Buffer;
  payload: Record<string, unknown>;
};

/** Split and decode; enforces the HS256 header pin. Does not check the signature. */
function parseToken(token: string): ParsedToken | null {
  if (typeof token !== 'string' || token.length > 8192) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, sigPart] = parts;
  const header = decodeJsonPart(headerPart);
  if (!header || header.alg !== 'HS256') return null;
  if (header.typ !== undefined && header.typ !== 'JWT') return null;
  if (header.crit !== undefined) return null;
  const payload = decodeJsonPart(payloadPart);
  if (!payload) return null;
  const signature = decodeB64urlStrict(sigPart);
  if (!signature || signature.length !== 32) return null;
  return {signingInput: `${headerPart}.${payloadPart}`, signature, payload};
}

function hs256Matches(parsed: ParsedToken, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(parsed.signingInput).digest();
  return expected.length === parsed.signature.length && timingSafeEqual(expected, parsed.signature);
}

function audienceList(aud: unknown): string[] | null {
  if (typeof aud === 'string') return [aud];
  if (Array.isArray(aud) && aud.length > 0 && aud.every((a) => typeof a === 'string')) {
    return aud as string[];
  }
  return null;
}

/**
 * Claim checks shared by the local-HMAC and portal-HTTP paths.
 * Origin-bound tokens need aud ∋ appId and aud ∋ SSO_EXPECTED_AUD, a jti, iat,
 * and exp - iat ≤ 60s. Legacy tokens (aud === appId only) pass only when
 * SSO_ALLOW_LEGACY_AUD=1, and still require SSO_EXPECTED_AUD to be set.
 */
export function checkSsoClaims(
  payload: Record<string, unknown>,
  policy: SsoPolicy,
  nowSec: number
): SsoResult<SsoTokenClaims> {
  if (!policy.expectedOrigin) return {ok: false, error: 'sso_not_configured'};

  if (payload.iss !== policy.issuer) return {ok: false, error: 'invalid_token'};
  if (payload.type !== 'sso' || payload.targetApp !== policy.appId) {
    return {ok: false, error: 'invalid_token'};
  }

  const auds = audienceList(payload.aud);
  if (!auds || !auds.includes(policy.appId)) return {ok: false, error: 'invalid_token'};
  const originBound = auds.some((a) => normalizeOrigin(a) === policy.expectedOrigin);
  const legacy = !originBound;
  if (legacy) {
    const isLegacyShape = typeof payload.aud === 'string' && payload.aud === policy.appId;
    if (!policy.allowLegacyAud || !isLegacyShape) return {ok: false, error: 'invalid_token'};
  }

  const {exp, iat, nbf} = payload;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return {ok: false, error: 'invalid_token'};
  if (exp + SSO_CLOCK_SKEW_SECONDS < nowSec) return {ok: false, error: 'token_expired'};
  if (nbf !== undefined) {
    if (typeof nbf !== 'number' || nbf - SSO_CLOCK_SKEW_SECONDS > nowSec) {
      return {ok: false, error: 'invalid_token'};
    }
  }
  if (iat !== undefined) {
    if (typeof iat !== 'number' || iat - SSO_CLOCK_SKEW_SECONDS > nowSec) {
      return {ok: false, error: 'invalid_token'};
    }
  }

  let jti: string | null = null;
  if (payload.jti !== undefined) {
    if (typeof payload.jti !== 'string' || !JTI_PATTERN.test(payload.jti)) {
      return {ok: false, error: 'invalid_token'};
    }
    jti = payload.jti;
  }

  if (!legacy) {
    if (!jti) return {ok: false, error: 'invalid_token'};
    if (typeof iat !== 'number') return {ok: false, error: 'invalid_token'};
    if (exp - iat > SSO_MAX_TOKEN_TTL_SECONDS || exp < iat) return {ok: false, error: 'invalid_token'};
  }

  const sub = payload.sub === undefined || payload.sub === null ? '' : String(payload.sub);
  const username = String(payload.username || '').trim();
  if (!sub || !username) return {ok: false, error: 'invalid_token'};

  return {
    ok: true,
    value: {
      user: {
        id: sub,
        username,
        email: payload.email != null ? String(payload.email) : null,
        fullname: String(payload.fullname || payload.username || ''),
        role: String(payload.role || 'User'),
        siteId: String(payload.siteId || 'main'),
      },
      jti,
      exp,
      legacy,
    },
  };
}

/** Portal POST /api/auth/sso/verify. Must verify the signature of this exact token string. */
export type PortalHttpVerify = (
  token: string,
  appId: string
) => Promise<SsoResult<{username?: string; id?: string | number}>>;

export const SSO_PORTAL_VERIFY_TIMEOUT_MS = 5000;

export function createPortalHttpVerify(opts: {
  getBase: () => string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): PortalHttpVerify {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? SSO_PORTAL_VERIFY_TIMEOUT_MS;
  return async (token, appId) => {
    let verifyResponse: Response;
    try {
      verifyResponse = await fetchImpl(`${opts.getBase()}/api/auth/sso/verify`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({token, appId}),
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      return {ok: false, error: 'iscout_connection_failed'};
    }

    if (!verifyResponse.ok) {
      if (verifyResponse.status === 401) return {ok: false, error: 'token_expired'};
      if (verifyResponse.status === 403) return {ok: false, error: 'invalid_token'};
      if (verifyResponse.status === 429) return {ok: false, error: 'rate_limited'};
      return {ok: false, error: 'verification_failed'};
    }

    // The timeout signal also covers reading the body.
    const body = (await verifyResponse.json().catch(() => ({}))) as {
      user?: {username?: string; id?: string | number};
    };
    if (!body.user?.username) return {ok: false, error: 'no_user'};
    return {ok: true, value: body.user};
  };
}

export type SsoVerifyDeps = {
  policy: SsoPolicy;
  /** null = interim mode: jti is validated but not recorded (see docs/sso.md). */
  jtiStore: SsoJtiStore | null;
  portalVerify: PortalHttpVerify;
  nowSec?: number;
};

/**
 * Full verification: HS256 pin → signature (local HMAC, or portal HTTP when no
 * secret is configured) → claims incl. canonical origin → one-time jti.
 * A configured secret is authoritative; failures never fall through to HTTP.
 */
export async function verifySsoTokenWith(
  token: string,
  deps: SsoVerifyDeps
): Promise<SsoResult<IscoutSsoUserClaims>> {
  const {policy} = deps;
  if (!policy.expectedOrigin || policy.secretInvalid) return {ok: false, error: 'sso_not_configured'};

  const parsed = parseToken(token);
  if (!parsed) return {ok: false, error: 'invalid_token'};

  if (policy.secret && !hs256Matches(parsed, policy.secret)) {
    return {ok: false, error: 'invalid_token'};
  }

  const nowSec = deps.nowSec ?? Math.floor(Date.now() / 1000);
  const claims = checkSsoClaims(parsed.payload, policy, nowSec);
  if (!claims.ok) return claims;

  if (!policy.secret) {
    const remote = await deps.portalVerify(token, policy.appId);
    if (!remote.ok) return remote;
    const remoteUser = remote.value;
    if (!remoteUser.username) return {ok: false, error: 'no_user'};
    if (
      String(remoteUser.username).trim() !== claims.value.user.username ||
      (remoteUser.id !== undefined && String(remoteUser.id) !== claims.value.user.id)
    ) {
      return {ok: false, error: 'invalid_token'};
    }
  }

  if (claims.value.jti && deps.jtiStore) {
    let outcome: 'consumed' | 'replayed';
    try {
      outcome = await deps.jtiStore.consume(claims.value.jti, policy.appId, claims.value.exp);
    } catch {
      return {ok: false, error: 'sso_unavailable'};
    }
    if (outcome !== 'consumed') return {ok: false, error: 'replayed_token'};
  }

  return {ok: true, value: claims.value.user};
}

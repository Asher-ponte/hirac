import {createHmac, timingSafeEqual} from 'node:crypto';
import {getIscoutSsoApiBase, type IscoutSsoUserClaims} from './sso-helpers';

function b64urlJson(part: string): Record<string, unknown> | null {
  try {
    const pad = part.length % 4 === 0 ? '' : '='.repeat(4 - (part.length % 4));
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString(
      'utf8'
    );
    const value = JSON.parse(json) as unknown;
    if (!value || typeof value !== 'object') return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Same HS256 claims as iScout generateSSOToken.
 * Set ISCOUT_JWT_SECRET (same value as iScout JWT_SECRET) to skip HTTP verify.
 * Never logs the token.
 */
export function tryVerifyIscoutSsoJwtLocally(
  token: string,
  appId: string
): IscoutSsoUserClaims | null {
  const secret = process.env.ISCOUT_JWT_SECRET;
  if (!secret || String(secret).trim().length < 16) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, sigPart] = parts;
  const header = b64urlJson(headerPart);
  if (!header || header.alg !== 'HS256') return null;

  let actual: Buffer;
  try {
    const pad = sigPart.length % 4 === 0 ? '' : '='.repeat(4 - (sigPart.length % 4));
    actual = Buffer.from(sigPart.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
  } catch {
    return null;
  }
  const expected = createHmac('sha256', secret).update(`${headerPart}.${payloadPart}`).digest();
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  const decoded = b64urlJson(payloadPart);
  if (!decoded) return null;

  const issuer = (process.env.JWT_ISSUER || 'iscout-sso').trim() || 'iscout-sso';
  if (decoded.iss !== issuer) return null;
  if (decoded.aud !== appId) return null;
  if (decoded.type !== 'sso' || decoded.targetApp !== appId) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof decoded.exp === 'number' && decoded.exp + 60 < nowSec) return null;
  if (typeof decoded.nbf === 'number' && decoded.nbf - 60 > nowSec) return null;

  const sub = decoded.sub === undefined || decoded.sub === null ? '' : String(decoded.sub);
  const username = String(decoded.username || '').trim();
  if (!sub || !username) return null;

  return {
    id: sub,
    username,
    email: decoded.email != null ? String(decoded.email) : null,
    fullname: String(decoded.fullname || decoded.username || ''),
    role: String(decoded.role || 'User'),
    siteId: String(decoded.siteId || 'main'),
  };
}

export type VerifySsoResult =
  | {ok: true; user: IscoutSsoUserClaims}
  | {ok: false; error: string};

/**
 * Verify a portal SSO token locally (if secret is set) or via iScout HTTP verify.
 * Does not log the token or the request query string.
 */
export async function verifyIscoutSsoToken(
  token: string,
  appId: string
): Promise<VerifySsoResult> {
  const local = tryVerifyIscoutSsoJwtLocally(token, appId);
  if (local) {
    return {ok: true, user: local};
  }

  const iscoutBase = getIscoutSsoApiBase();
  let verifyResponse: Response;
  try {
    verifyResponse = await fetch(`${iscoutBase}/api/auth/sso/verify`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({token, appId}),
      cache: 'no-store',
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

  const body = (await verifyResponse.json().catch(() => ({}))) as {user?: IscoutSsoUserClaims};
  const user = body.user;
  if (!user?.username) {
    return {ok: false, error: 'no_user'};
  }
  return {ok: true, user};
}

export {getIscoutSsoApiBase};

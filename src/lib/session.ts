import {SignJWT, jwtVerify} from 'jose';
import {SESSION_MAX_AGE_SECONDS, type HiracSession, type IscoutSsoUserClaims} from './sso-helpers';

/**
 * Signed `hirac-session` cookie. Runs in both the Edge middleware and Node
 * (route handlers, server actions), so it must only use Web Crypto via jose.
 *
 * The cookie is stateless: identity and role are fixed when it is issued. A
 * role change or account disable in iScout takes effect only on the user's next
 * SSO or when the cookie expires (SESSION_MAX_AGE_SECONDS, 8h). Rotating
 * HIRAC_SESSION_SECRET invalidates every session immediately.
 */

export const SESSION_SECRET_ENV = 'HIRAC_SESSION_SECRET';
export const MIN_SESSION_SECRET_LENGTH = 32;
export const ADMIN_ROLE = 'Admin';

const SESSION_ISSUER = 'hirac';
const SESSION_AUDIENCE = 'hirac-session';
const SESSION_ALG = 'HS256';
const MAX_TOKEN_LENGTH = 4096;
const CLOCK_TOLERANCE_SECONDS = 5;

export class SessionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionConfigError';
  }
}

type Env = Record<string, string | undefined>;

/** Throws (fail closed) when the secret is missing, too short, or reused from the portal. */
export function getSessionKey(env: Env = process.env): Uint8Array {
  const secret = env[SESSION_SECRET_ENV];
  if (typeof secret !== 'string' || secret.trim().length < MIN_SESSION_SECRET_LENGTH) {
    throw new SessionConfigError(
      `${SESSION_SECRET_ENV} is missing or shorter than ${MIN_SESSION_SECRET_LENGTH} characters`
    );
  }
  const portalSecret = env.ISCOUT_JWT_SECRET;
  if (portalSecret && portalSecret === secret) {
    throw new SessionConfigError(`${SESSION_SECRET_ENV} must not reuse ISCOUT_JWT_SECRET`);
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  user: IscoutSsoUserClaims,
  key: Uint8Array = getSessionKey(),
  nowMs: number = Date.now()
): Promise<string> {
  const id = user.id == null ? '' : String(user.id).trim();
  const username = typeof user.username === 'string' ? user.username.trim() : '';
  if (!id || !username) {
    throw new Error('Cannot create a session without a user id and username');
  }
  const iat = Math.floor(nowMs / 1000);
  return new SignJWT({
    username,
    email: user.email ?? null,
    fullname: user.fullname || username,
    role: nonEmptyString(user.role) ? user.role : 'User',
    siteId: nonEmptyString(user.siteId) ? user.siteId : 'main',
  })
    .setProtectedHeader({alg: SESSION_ALG, typ: 'JWT'})
    .setSubject(id)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_MAX_AGE_SECONDS)
    .sign(key);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Returns the session only if the signature, issuer, audience and expiry all check out. */
export async function verifySessionToken(
  token: string | null | undefined,
  key: Uint8Array,
  nowMs: number = Date.now()
): Promise<HiracSession | null> {
  if (!token || typeof token !== 'string' || token.length > MAX_TOKEN_LENGTH) return null;
  try {
    const {payload} = await jwtVerify(token, key, {
      algorithms: [SESSION_ALG],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      requiredClaims: ['sub', 'iat', 'exp'],
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
      currentDate: new Date(nowMs),
    });
    const {sub, username, email, fullname, role, siteId, iat, exp} = payload;
    if (!nonEmptyString(sub) || !nonEmptyString(username) || !nonEmptyString(role)) return null;
    if (typeof iat !== 'number' || typeof exp !== 'number') return null;
    if (exp - iat > SESSION_MAX_AGE_SECONDS) return null;
    return {
      id: sub,
      username,
      email: typeof email === 'string' ? email : null,
      fullname: typeof fullname === 'string' ? fullname : username,
      role,
      siteId: nonEmptyString(siteId) ? siteId : 'main',
      createdAt: iat * 1000,
      lastActivity: iat * 1000,
      expiresAt: exp * 1000,
    };
  } catch {
    return null;
  }
}

let warnedMissingSecret = false;

/**
 * Cookie value -> verified session, or null. A misconfigured secret is treated
 * as "no session" so every request is denied rather than trusted.
 */
export async function readSessionToken(
  token: string | null | undefined,
  env: Env = process.env
): Promise<HiracSession | null> {
  let key: Uint8Array;
  try {
    key = getSessionKey(env);
  } catch (error) {
    if (error instanceof SessionConfigError && !warnedMissingSecret) {
      warnedMissingSecret = true;
      console.error(`[auth] ${error.message}; all sessions are rejected.`);
    }
    return null;
  }
  return verifySessionToken(token, key);
}

export function hasRole(session: Pick<HiracSession, 'role'>, ...roles: string[]): boolean {
  const actual = session.role.trim().toLowerCase();
  return roles.some(role => role.trim().toLowerCase() === actual);
}

export function isAdmin(session: Pick<HiracSession, 'role'>): boolean {
  return hasRole(session, ADMIN_ROLE);
}

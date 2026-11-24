/** iScout portal app id for this satellite — see qaehs-iscout server/services/appRegistry.js */
export const HIRAC_SSO_APP_ID = 'hirac';

export const SESSION_COOKIE = 'hirac-session';
export const SESSION_ID_COOKIE = 'session_id';
export const SITE_ID_COOKIE = 'site_id';

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export type IscoutSsoUserClaims = {
  id: string;
  username: string;
  email: string | null;
  fullname: string;
  role: string;
  siteId: string;
};

export type HiracSession = IscoutSsoUserClaims & {
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
};

const REDIRECT_CHECK_ORIGIN = 'https://hirac.invalid';
const MAX_REDIRECT_LENGTH = 2048;
const MAX_REDIRECT_DECODE_PASSES = 4;
const RAW_UNSAFE = /[\x00-\x20\x7f\\]/;
const ENCODED_UNSAFE = /%(?:[01][0-9a-f]|20|2f|5c|7f)/i;

/**
 * True if `value`, or any of up to MAX_REDIRECT_DECODE_PASSES percent-decodings
 * of it, contains a control character, whitespace, backslash, slash escape or
 * `//`. Anything still encoded after the last pass, or undecodable, is unsafe.
 */
function hasUnsafeRedirectChars(value: string): boolean {
  let current = value;
  for (let pass = 0; pass <= MAX_REDIRECT_DECODE_PASSES; pass++) {
    if (RAW_UNSAFE.test(current) || current.includes('//') || ENCODED_UNSAFE.test(current)) {
      return true;
    }
    if (!current.includes('%')) return false;
    if (pass === MAX_REDIRECT_DECODE_PASSES) return true;
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return true;
    }
    if (decoded === current) return false;
    current = decoded;
  }
  return true;
}

/**
 * Same-origin relative paths only. Portal default redirect is `/`.
 * Browsers silently drop tabs/newlines and treat `\` like `/` in URLs, so any
 * control character, whitespace, backslash or `//` is rejected outright rather
 * than stripped, including when percent-encoded (at any nesting depth). The
 * result is resolved against a fixed origin and must stay on it.
 */
export function sanitizeSsoRedirect(redirect: string | null | undefined): string {
  if (!redirect || typeof redirect !== 'string') return '/';
  if (redirect.length > MAX_REDIRECT_LENGTH) return '/';
  if (!redirect.startsWith('/') || hasUnsafeRedirectChars(redirect)) return '/';

  let url: URL;
  try {
    url = new URL(redirect, REDIRECT_CHECK_ORIGIN);
  } catch {
    return '/';
  }
  if (url.origin !== REDIRECT_CHECK_ORIGIN) return '/';

  const path = `${url.pathname}${url.search}${url.hash}`;
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  return path;
}

/**
 * Resolve iScout API origin for POST /api/auth/sso/verify.
 * Must match the deployment that signed the JWT (same rules as EHS / FL Check).
 */
export function getIscoutSsoApiBase(): string {
  const isProdLike =
    process.env.VERCEL === '1' ||
    process.env.VERCEL === 'true' ||
    process.env.NODE_ENV === 'production';
  const raw = (process.env.ISCOUT_BASE_URL || '').trim().replace(/\/$/, '');
  let base: string;
  if (raw) {
    base = raw;
  } else if (isProdLike) {
    base = 'https://iscoutapp.co';
  } else {
    base = 'http://localhost:3002';
  }
  const legacyVercel = /^https?:\/\/(www\.)?iscout\.vercel\.app$/i;
  if (
    isProdLike &&
    legacyVercel.test(base) &&
    String(process.env.ALLOW_LEGACY_ISCOUT_VERCEL_SSO || '').trim() !== '1'
  ) {
    return 'https://iscoutapp.co';
  }
  return base;
}

export function portalSsoErrorMessage(code: string | null): string | null {
  if (!code) return null;
  const byCode: Record<string, string> = {
    session_not_configured: 'Sign-in is not available on this deployment. Contact support.',
    no_token: 'Single sign-on link is missing a token.',
    token_expired: 'Portal sign-in expired. Open HIRAC again from the iScout portal.',
    invalid_token: 'Portal sign-in was rejected. Try again from the iScout portal.',
    verification_failed: 'Could not verify sign-in with iScout. Try again or contact support.',
    rate_limited: 'Sign-in from the portal was rate limited. Try again in a minute.',
    iscout_connection_failed: 'Could not reach iScout to verify sign-in. Check your connection.',
    no_user: 'No user data returned during sign-in.',
    sso_failed: 'Sign-in from portal failed. Try again from the iScout portal.',
  };
  return byCode[code] || `Sign-in from portal failed (${code}). Try again from the iScout portal.`;
}

/** Lax (not Strict) so the cookie survives the redirect that follows the portal handoff. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  };
}

/** Same attributes as the live cookie so browsers accept the overwrite. */
export function clearedCookieOptions() {
  return {...sessionCookieOptions(), maxAge: 0};
}

export function loginErrorPath(code: string): string {
  return `/login?error=${encodeURIComponent(code)}`;
}

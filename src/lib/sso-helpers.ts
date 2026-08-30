/** iScout portal app id for this satellite — see qaehs-iscout server/services/appRegistry.js */
export const HIRAC_SSO_APP_ID = 'hirac';

export const SESSION_COOKIE = 'hirac-session';
export const SESSION_ID_COOKIE = 'session_id';
export const SITE_ID_COOKIE = 'site_id';

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

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

/**
 * Same-origin relative paths only. Portal default redirect is `/`.
 * Rejects protocol-relative and absolute URLs (open redirect).
 */
export function sanitizeSsoRedirect(redirect: string | null | undefined): string {
  if (!redirect || typeof redirect !== 'string') return '/';
  const value = redirect.trim();
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//') || value.startsWith('/\\')) return '/';
  if (value.includes('://') || value.includes('\\')) return '/';
  if (value.includes('\0') || value.includes('\n') || value.includes('\r')) return '/';
  return value;
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

export function sessionCookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  };
}

export function buildSession(user: IscoutSsoUserClaims): HiracSession {
  const now = Date.now();
  return {
    ...user,
    createdAt: now,
    lastActivity: now,
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
  };
}

export function parseSessionValue(raw: string | undefined | null): HiracSession | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as HiracSession;
    if (!data?.username || !data?.id) return null;
    if (typeof data.expiresAt === 'number' && Date.now() > data.expiresAt) return null;
    return data;
  } catch {
    return null;
  }
}

export function loginErrorPath(code: string): string {
  return `/login?error=${encodeURIComponent(code)}`;
}

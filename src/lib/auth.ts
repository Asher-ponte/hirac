import {cookies} from 'next/headers';
import {SESSION_COOKIE, type HiracSession} from './sso-helpers';
import {ADMIN_ROLE, hasRole, readSessionToken} from './session';

export type AuthErrorCode = 'unauthenticated' | 'forbidden';

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode) {
    super(code === 'unauthenticated' ? 'Not signed in.' : 'Not permitted.');
    this.name = 'AuthError';
    this.code = code;
  }
}

/** Verified session from the request cookie, or null. Never trusts client-supplied identity. */
export async function getSession(): Promise<HiracSession | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Call first in every server action / data route. Throws AuthError when unauthenticated. */
export async function requireSession(): Promise<HiracSession> {
  const session = await getSession();
  if (!session) throw new AuthError('unauthenticated');
  return session;
}

export async function requireRole(...roles: string[]): Promise<HiracSession> {
  const session = await requireSession();
  if (!hasRole(session, ...roles)) throw new AuthError('forbidden');
  return session;
}

export async function requireAdmin(): Promise<HiracSession> {
  return requireRole(ADMIN_ROLE);
}

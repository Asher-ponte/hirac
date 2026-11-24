import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {SESSION_COOKIE, type HiracSession} from './sso-helpers';
import {ADMIN_ROLE, hasRole, readSessionToken} from './session';

export class AuthError extends Error {
  readonly code = 'forbidden';

  constructor() {
    super('Not permitted.');
    this.name = 'AuthError';
  }
}

/** Verified session from the request cookie, or null. Never trusts client-supplied identity. */
export async function getSession(): Promise<HiracSession | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * Call first in every server action / data route. A missing, legacy or invalid
 * cookie redirects to /login (Next turns this into a client navigation for
 * server actions), so stale sessions re-authenticate instead of erroring.
 */
export async function requireSession(): Promise<HiracSession> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

export async function requireRole(...roles: string[]): Promise<HiracSession> {
  const session = await requireSession();
  if (!hasRole(session, ...roles)) throw new AuthError();
  return session;
}

export async function requireAdmin(): Promise<HiracSession> {
  return requireRole(ADMIN_ROLE);
}

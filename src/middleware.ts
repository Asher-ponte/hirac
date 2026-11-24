import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {SESSION_COOKIE, clearedCookieOptions} from '@/lib/sso-helpers';
import {isAdmin, readSessionToken} from '@/lib/session';

function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico'
  );
}

function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export async function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(raw);
  if (!session) {
    // Server action clients can't follow a 307; let the action's own
    // requireSession() issue a Next redirect to /login instead.
    const response = request.headers.has('next-action')
      ? NextResponse.next()
      : NextResponse.redirect(new URL('/login', request.url));
    if (raw !== undefined) {
      response.cookies.set(SESSION_COOKIE, '', clearedCookieOptions());
    }
    return response;
  }

  if (isAdminPath(pathname) && !isAdmin(session)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

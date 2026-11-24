import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {SESSION_COOKIE} from '@/lib/sso-helpers';
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
    const response = NextResponse.redirect(new URL('/login', request.url));
    if (raw !== undefined) {
      response.cookies.set(SESSION_COOKIE, '', {path: '/', maxAge: 0});
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

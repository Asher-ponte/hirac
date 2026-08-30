import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {SESSION_COOKIE, parseSessionValue} from '@/lib/sso-helpers';

function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico'
  );
}

export function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = parseSessionValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const login = new URL('/login', request.url);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

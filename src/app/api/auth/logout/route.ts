import {NextRequest, NextResponse} from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_ID_COOKIE,
  SITE_ID_COOKIE,
  clearedCookieOptions,
} from '@/lib/sso-helpers';

function clearAndRedirect(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.set(SESSION_COOKIE, '', clearedCookieOptions());
  response.cookies.set(SESSION_ID_COOKIE, '', clearedCookieOptions());
  response.cookies.set(SITE_ID_COOKIE, '', clearedCookieOptions());
  return response;
}

export async function GET(request: NextRequest) {
  return clearAndRedirect(request);
}

export async function POST(request: NextRequest) {
  return clearAndRedirect(request);
}

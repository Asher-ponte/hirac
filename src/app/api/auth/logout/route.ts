import {NextRequest, NextResponse} from 'next/server';
import {SESSION_COOKIE, SESSION_ID_COOKIE, SITE_ID_COOKIE} from '@/lib/sso-helpers';

function clearAndRedirect(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.set(SESSION_COOKIE, '', {path: '/', maxAge: 0});
  response.cookies.set(SESSION_ID_COOKIE, '', {path: '/', maxAge: 0});
  response.cookies.set(SITE_ID_COOKIE, '', {path: '/', maxAge: 0});
  return response;
}

export async function GET(request: NextRequest) {
  return clearAndRedirect(request);
}

export async function POST(request: NextRequest) {
  return clearAndRedirect(request);
}

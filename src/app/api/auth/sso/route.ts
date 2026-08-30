import {NextRequest, NextResponse} from 'next/server';
import {verifyIscoutSsoToken} from '@/lib/iscout-sso-verify';
import {
  HIRAC_SSO_APP_ID,
  SESSION_COOKIE,
  SESSION_ID_COOKIE,
  SITE_ID_COOKIE,
  buildSession,
  loginErrorPath,
  sanitizeSsoRedirect,
  sessionCookieOptions,
} from '@/lib/sso-helpers';

/**
 * Portal tile handler. iScout opens /api/auth/sso?token=…&redirect=/
 * Verifies the token (local JWT or POST to iScout /api/auth/sso/verify) and
 * sets session cookies. Does not write to Cloud SQL. Does not log the token.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const redirectTo = sanitizeSsoRedirect(request.nextUrl.searchParams.get('redirect'));

  if (!token) {
    return NextResponse.redirect(new URL(loginErrorPath('no_token'), request.url));
  }

  const appId = (process.env.ISCOUT_SSO_APP_ID || HIRAC_SSO_APP_ID).trim() || HIRAC_SSO_APP_ID;

  try {
    const result = await verifyIscoutSsoToken(token, appId);
    if (!result.ok) {
      return NextResponse.redirect(new URL(loginErrorPath(result.error), request.url));
    }

    const user = result.user;
    const siteId = user.siteId || 'main';
    const session = buildSession({...user, siteId});
    const response = NextResponse.redirect(new URL(redirectTo, request.url));
    const cookie = sessionCookieOptions();

    response.cookies.set(SESSION_COOKIE, JSON.stringify(session), cookie);
    response.cookies.set(SESSION_ID_COOKIE, String(user.id), cookie);
    response.cookies.set(SITE_ID_COOKIE, siteId, cookie);

    return response;
  } catch {
    return NextResponse.redirect(new URL(loginErrorPath('sso_failed'), request.url));
  }
}

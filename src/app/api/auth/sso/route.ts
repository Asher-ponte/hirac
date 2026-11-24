import {NextRequest, NextResponse} from 'next/server';
import {verifyIscoutSsoToken} from '@/lib/iscout-sso-verify';
import {createSessionToken, getSessionKey} from '@/lib/session';
import {
  HIRAC_SSO_APP_ID,
  SESSION_COOKIE,
  SESSION_ID_COOKIE,
  SITE_ID_COOKIE,
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

  let sessionKey: Uint8Array;
  try {
    sessionKey = getSessionKey();
  } catch {
    return NextResponse.redirect(new URL(loginErrorPath('session_not_configured'), request.url));
  }

  const appId = (process.env.ISCOUT_SSO_APP_ID || HIRAC_SSO_APP_ID).trim() || HIRAC_SSO_APP_ID;

  try {
    const result = await verifyIscoutSsoToken(token, appId);
    if (!result.ok) {
      return NextResponse.redirect(new URL(loginErrorPath(result.error), request.url));
    }

    const user = result.user;
    const siteId = user.siteId || 'main';
    const sessionToken = await createSessionToken({...user, siteId}, sessionKey);
    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    response.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
    // Legacy unsigned cookies; nothing may trust them, so clear any left over.
    response.cookies.set(SESSION_ID_COOKIE, '', {path: '/', maxAge: 0});
    response.cookies.set(SITE_ID_COOKIE, '', {path: '/', maxAge: 0});

    return response;
  } catch {
    return NextResponse.redirect(new URL(loginErrorPath('sso_failed'), request.url));
  }
}

import {getIscoutSsoApiBase, type IscoutSsoUserClaims} from './sso-helpers';
import {
  readSsoPolicyFromEnv,
  verifySsoTokenWith,
  type PortalHttpVerify,
  type SsoErrorCode,
} from './iscout-sso-jwt';
import {selectSsoJtiStore} from './sso-jti-store';

export type VerifySsoResult =
  | {ok: true; user: IscoutSsoUserClaims}
  | {ok: false; error: SsoErrorCode};

const portalHttpVerify: PortalHttpVerify = async (token, appId) => {
  let verifyResponse: Response;
  try {
    verifyResponse = await fetch(`${getIscoutSsoApiBase()}/api/auth/sso/verify`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({token, appId}),
      cache: 'no-store',
    });
  } catch {
    return {ok: false, error: 'iscout_connection_failed'};
  }

  if (!verifyResponse.ok) {
    if (verifyResponse.status === 401) return {ok: false, error: 'token_expired'};
    if (verifyResponse.status === 403) return {ok: false, error: 'invalid_token'};
    if (verifyResponse.status === 429) return {ok: false, error: 'rate_limited'};
    return {ok: false, error: 'verification_failed'};
  }

  const body = (await verifyResponse.json().catch(() => ({}))) as {
    user?: {username?: string; id?: string | number};
  };
  if (!body.user?.username) return {ok: false, error: 'no_user'};
  return {ok: true, value: body.user};
};

/**
 * Verify a portal SSO token. Requires SSO_EXPECTED_AUD (fails closed when unset),
 * pins HS256, binds the token to this deployment's canonical origin and enforces
 * one-time jti use when SSO_JTI_STORE is configured. See docs/sso.md.
 * Does not log the token or the request query string.
 */
export async function verifyIscoutSsoToken(token: string, appId: string): Promise<VerifySsoResult> {
  const selection = selectSsoJtiStore(process.env);
  if (!selection.ok) return {ok: false, error: selection.error};

  const result = await verifySsoTokenWith(token, {
    policy: readSsoPolicyFromEnv(process.env, appId),
    jtiStore: selection.store,
    portalVerify: portalHttpVerify,
  });
  return result.ok ? {ok: true, user: result.value} : result;
}

export {getIscoutSsoApiBase};

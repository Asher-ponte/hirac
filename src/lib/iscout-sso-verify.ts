import {getIscoutSsoApiBase, type IscoutSsoUserClaims} from './sso-helpers';
import {
  createPortalHttpVerify,
  readSsoPolicyFromEnv,
  verifySsoTokenWith,
  type SsoErrorCode,
} from './iscout-sso-jwt';
import {selectSsoJtiStore} from './sso-jti-store';

export type VerifySsoResult =
  | {ok: true; user: IscoutSsoUserClaims}
  | {ok: false; error: SsoErrorCode};

const portalHttpVerify = createPortalHttpVerify({getBase: getIscoutSsoApiBase});

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

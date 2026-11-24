# iScout portal SSO handoff

The portal opens `GET /api/auth/sso?token=…&redirect=/`. The token is an HS256
JWT minted by iScout. Verification lives in `src/lib/iscout-sso-jwt.ts`
(pure core) and `src/lib/iscout-sso-verify.ts` (env + HTTP wiring).

## Token contract

| Claim       | Requirement |
|-------------|-------------|
| header      | `alg` must be exactly `HS256`; `typ`, if present, `JWT`; no `crit` |
| `iss`       | `JWT_ISSUER` (default `iscout-sso`) |
| `aud`       | array containing **both** `ISCOUT_SSO_APP_ID` (default `hirac`) and the canonical origin in `SSO_EXPECTED_AUD`, e.g. `["hirac", "https://hirac.iscoutapp.co"]` |
| `type`      | `sso` |
| `targetApp` | `ISCOUT_SSO_APP_ID` |
| `jti`       | required; 8–128 chars of `[A-Za-z0-9_-]` (a UUID fits) |
| `iat`/`exp` | both required; `exp - iat` ≤ 60s; 30s clock skew tolerated |
| `sub`, `username` | required |

## Environment

| Variable | Where | Meaning |
|----------|-------|---------|
| `SSO_EXPECTED_AUD` | Production only | Canonical origin, e.g. `https://hirac.iscoutapp.co`. **Unset ⇒ every portal SSO request is rejected** (`sso_not_configured`). This is what stops Vercel previews and other deployments from accepting production tokens. |
| `SSO_ALLOW_LEGACY_AUD` | optional, default off | `1` also accepts pre-origin tokens (`aud === "hirac"` as a plain string, no `jti`, no TTL cap). Only for the rollout window while the portal is switching; remove it once the portal mints origin-bound tokens. Still requires `SSO_EXPECTED_AUD`, so previews stay closed. Legacy tokens get no replay protection beyond `exp`. |
| `SSO_JTI_STORE` | optional | `none`/unset (interim, see below) or `cloudsql`. Any other value fails closed. |
| `ISCOUT_JWT_SECRET` | optional | Same value as the portal `JWT_SECRET`. When set (≥16 chars) the signature is checked locally and is authoritative: a bad signature never falls back to the portal. When unset, the portal `POST /api/auth/sso/verify` checks the signature, but all claim checks above still run locally first. |

## One-time use (`jti`)

`SsoJtiStore` (in `iscout-sso-jwt.ts`) is the interface. Implementations must
be shared across instances; per-process memory is not acceptable on serverless
because each instance would keep its own set and a replay to another instance
would succeed.

- **Interim (`SSO_JTI_STORE` unset):** `jti` is required and validated but not
  recorded. A captured token can be replayed until it expires, which is at most
  60s TTL + 30s skew, and only against the deployment whose origin is in `aud`.
- **`SSO_JTI_STORE=cloudsql`:** `CloudSqlSsoJtiStore` inserts into
  `sso_consumed_jti`; a duplicate key means replay (`replayed_token`). Any
  storage error fails closed (`sso_unavailable`). Requires
  `db/migrations/pending/0001_sso_consumed_jti.sql`, which is **not applied**
  and waits for an explicit go. Apply the migration before setting the env var.

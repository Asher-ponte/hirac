import type {SsoJtiStore} from './iscout-sso-jwt';

/** Must match db/migrations/pending/0001_sso_consumed_jti.sql. Not part of schema.ts on purpose (db:push must not create it). */
export const SSO_JTI_TABLE = 'sso_consumed_jti';

export type SsoJtiStoreSelection =
  | {ok: true; store: SsoJtiStore | null}
  | {ok: false; error: 'sso_not_configured'};

export function isDuplicateKeyError(err: unknown): boolean {
  for (let e: unknown = err, depth = 0; e && depth < 4; depth++) {
    const code = (e as {code?: unknown}).code;
    const errno = (e as {errno?: unknown}).errno;
    if (code === 'ER_DUP_ENTRY' || errno === 1062) return true;
    e = (e as {cause?: unknown}).cause;
  }
  return false;
}

/**
 * Cloud SQL (MySQL) store. Only usable after the pending migration has been
 * applied; until then every consume throws and SSO fails closed.
 */
export class CloudSqlSsoJtiStore implements SsoJtiStore {
  async consume(jti: string, appId: string, expiresAtSec: number): Promise<'consumed' | 'replayed'> {
    const {readCloudSqlEnv} = await import('./db/cloud-sql-config');
    if (!readCloudSqlEnv()) {
      // getDb() would hand back the mock DB outside production, which would silently accept replays.
      throw new Error('SSO jti store: Cloud SQL is not configured');
    }
    const [{getDb}, {sql}] = await Promise.all([import('./db'), import('drizzle-orm')]);
    const db = await getDb();
    try {
      await db.execute(
        sql`INSERT INTO ${sql.identifier(SSO_JTI_TABLE)} (jti, app_id, expires_at) VALUES (${jti}, ${appId}, FROM_UNIXTIME(${Math.floor(expiresAtSec)}))`
      );
      return 'consumed';
    } catch (err) {
      if (isDuplicateKeyError(err)) return 'replayed';
      throw err;
    }
  }
}

/**
 * SSO_JTI_STORE selects the one-time-use backend:
 *   unset / "none" → interim: no shared store yet, jti is validated but not recorded
 *   "cloudsql"     → CloudSqlSsoJtiStore (requires the pending migration)
 *   anything else  → misconfigured, SSO fails closed
 */
export function selectSsoJtiStore(env: Record<string, string | undefined>): SsoJtiStoreSelection {
  const mode = (env.SSO_JTI_STORE || '').trim().toLowerCase();
  if (mode === '' || mode === 'none') return {ok: true, store: null};
  if (mode === 'cloudsql') return {ok: true, store: new CloudSqlSsoJtiStore()};
  return {ok: false, error: 'sso_not_configured'};
}

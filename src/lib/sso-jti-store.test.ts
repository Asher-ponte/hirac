import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {CloudSqlSsoJtiStore, isDuplicateKeyError, selectSsoJtiStore} from './sso-jti-store.ts';

describe('selectSsoJtiStore', () => {
  it('defaults to the interim mode (no store)', () => {
    assert.deepEqual(selectSsoJtiStore({}), {ok: true, store: null});
    assert.deepEqual(selectSsoJtiStore({SSO_JTI_STORE: 'none'}), {ok: true, store: null});
  });

  it('selects Cloud SQL only when asked', () => {
    const r = selectSsoJtiStore({SSO_JTI_STORE: 'cloudsql'});
    assert.ok(r.ok && r.store instanceof CloudSqlSsoJtiStore);
  });

  it('fails closed on unknown values (no in-memory option)', () => {
    for (const v of ['memory', 'redis', 'true']) {
      assert.deepEqual(selectSsoJtiStore({SSO_JTI_STORE: v}), {ok: false, error: 'sso_not_configured'});
    }
  });
});

describe('isDuplicateKeyError', () => {
  it('detects mysql2 duplicate keys, including wrapped causes', () => {
    assert.ok(isDuplicateKeyError({code: 'ER_DUP_ENTRY'}));
    assert.ok(isDuplicateKeyError({errno: 1062}));
    assert.ok(isDuplicateKeyError(new Error('wrapped', {cause: {code: 'ER_DUP_ENTRY'}})));
    assert.ok(!isDuplicateKeyError({code: 'ER_NO_SUCH_TABLE'}));
    assert.ok(!isDuplicateKeyError(undefined));
  });
});

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  CLOUD_SQL_ENV_NAMES,
  decodeServiceAccountKey,
  mysqlPoolOptionsFromConnectorStream,
  readCloudSqlEnv,
} from './cloud-sql-config.ts';

describe('Cloud SQL connector env', () => {
  it('uses the connector env names and not DB_HOST', () => {
    assert.deepEqual(CLOUD_SQL_ENV_NAMES, [
      'DB_INSTANCE_CONNECTION_NAME',
      'GOOGLE_SERVICE_ACCOUNT_KEY_BASE64',
      'DB_USER',
      'DB_PASSWORD',
      'DB_DATABASE',
    ]);
    assert.ok(!CLOUD_SQL_ENV_NAMES.includes('DB_HOST' as (typeof CLOUD_SQL_ENV_NAMES)[number]));
  });

  it('requires all five connector env values', () => {
    assert.equal(readCloudSqlEnv({}), null);
    assert.equal(
      readCloudSqlEnv({
        DB_HOST: '127.0.0.1',
        DB_USER: 'u',
        DB_PASSWORD: 'p',
        DB_DATABASE: 'd',
      }),
      null
    );
    const cfg = readCloudSqlEnv({
      DB_INSTANCE_CONNECTION_NAME: 'proj:region:inst',
      GOOGLE_SERVICE_ACCOUNT_KEY_BASE64: 'YWJj',
      DB_USER: 'u',
      DB_PASSWORD: 'p',
      DB_DATABASE: 'd',
    });
    assert.ok(cfg);
    assert.equal(cfg?.instanceConnectionName, 'proj:region:inst');
  });
});

describe('mysqlPoolOptionsFromConnectorStream', () => {
  it('passes stream and credentials without host or port', () => {
    const stream = () => ({});
    const options = mysqlPoolOptionsFromConnectorStream({
      stream,
      user: 'u',
      password: 'p',
      database: 'd',
    });
    assert.equal(options.stream, stream);
    assert.equal(options.user, 'u');
    assert.equal(options.database, 'd');
    assert.ok(!('host' in options));
    assert.ok(!('port' in options));
    assert.ok(!('socketPath' in options));
  });
});

describe('decodeServiceAccountKey', () => {
  it('decodes JSON and throws a generic error on garbage', () => {
    const payload = Buffer.from(JSON.stringify({client_email: 'sa@example.com'}), 'utf8').toString(
      'base64'
    );
    const creds = decodeServiceAccountKey(payload);
    assert.equal(creds.client_email, 'sa@example.com');

    try {
      decodeServiceAccountKey('not-valid-json');
      assert.fail('expected throw');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      assert.match(message, /invalid/);
      assert.ok(!message.includes('not-valid-json'));
    }
  });
});

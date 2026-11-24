import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {describe, it} from 'node:test';
import {
  SSO_MAX_TOKEN_TTL_SECONDS,
  normalizeOrigin,
  readSsoPolicyFromEnv,
  verifySsoTokenWith,
  type PortalHttpVerify,
  type SsoJtiStore,
  type SsoPolicy,
} from './iscout-sso-jwt.ts';

const SECRET = 'test-secret-not-real-0123456789';
const ORIGIN = 'https://hirac.iscoutapp.co';
const NOW = 1_800_000_000;

function b64(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function sign(payload: Record<string, unknown>, opts: {header?: Record<string, unknown>; secret?: string} = {}) {
  const head = b64(opts.header ?? {alg: 'HS256', typ: 'JWT'});
  const body = b64(payload);
  const sig = createHmac('sha256', opts.secret ?? SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

function claims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    iss: 'iscout-sso',
    aud: ['hirac', ORIGIN],
    type: 'sso',
    targetApp: 'hirac',
    sub: '42',
    username: 'jdoe',
    email: 'jdoe@example.test',
    fullname: 'J Doe',
    role: 'User',
    siteId: 'main',
    jti: '6f1c2d4e-9a8b-4c7d-8e6f-5a4b3c2d1e0f',
    iat: NOW,
    exp: NOW + 60,
    ...overrides,
  };
}

function policy(overrides: Partial<SsoPolicy> = {}): SsoPolicy {
  return {
    appId: 'hirac',
    issuer: 'iscout-sso',
    expectedOrigin: ORIGIN,
    allowLegacyAud: false,
    secret: SECRET,
    ...overrides,
  };
}

class SharedStore implements SsoJtiStore {
  seen = new Set<string>();
  async consume(jti: string) {
    if (this.seen.has(jti)) return 'replayed' as const;
    this.seen.add(jti);
    return 'consumed' as const;
  }
}

const noHttp: PortalHttpVerify = async () => {
  throw new Error('portal HTTP verify must not be called');
};

function verify(token: string, p: Partial<SsoPolicy> = {}, extra: {store?: SsoJtiStore | null; portal?: PortalHttpVerify} = {}) {
  return verifySsoTokenWith(token, {
    policy: policy(p),
    jtiStore: extra.store === undefined ? new SharedStore() : extra.store,
    portalVerify: extra.portal ?? noHttp,
    nowSec: NOW,
  });
}

describe('origin binding', () => {
  it('accepts an origin-bound token', async () => {
    const r = await verify(sign(claims()));
    assert.ok(r.ok);
    assert.equal(r.value.username, 'jdoe');
    assert.equal(r.value.id, '42');
  });

  it('fails closed when SSO_EXPECTED_AUD is unset (e.g. Vercel preview)', async () => {
    const r = await verify(sign(claims()), {expectedOrigin: null});
    assert.deepEqual(r, {ok: false, error: 'sso_not_configured'});
  });

  it('rejects a token bound to a different origin', async () => {
    const r = await verify(sign(claims({aud: ['hirac', 'https://hirac-git-x.vercel.app']})));
    assert.deepEqual(r, {ok: false, error: 'invalid_token'});
  });

  it('rejects a token for a different deployment of this app', async () => {
    const r = await verify(sign(claims()), {expectedOrigin: 'https://hirac-preview.vercel.app'});
    assert.deepEqual(r, {ok: false, error: 'invalid_token'});
  });

  it('requires the app id in aud as well as the origin', async () => {
    const r = await verify(sign(claims({aud: [ORIGIN]})));
    assert.deepEqual(r, {ok: false, error: 'invalid_token'});
  });

  it('rejects origin look-alikes', async () => {
    for (const aud of [`${ORIGIN}.evil.test`, `${ORIGIN}/path`, 'http://hirac.iscoutapp.co']) {
      const r = await verify(sign(claims({aud: ['hirac', aud]})));
      assert.equal(r.ok, false, aud);
    }
  });

  it('still checks iss, type and targetApp', async () => {
    for (const o of [{iss: 'other'}, {type: 'access'}, {targetApp: 'ehs'}]) {
      const r = await verify(sign(claims(o)));
      assert.deepEqual(r, {ok: false, error: 'invalid_token'}, JSON.stringify(o));
    }
  });
});

describe('legacy tokens', () => {
  const legacy = () => {
    const c = claims({aud: 'hirac'});
    delete c.jti;
    delete c.iat;
    c.exp = NOW + 300;
    return c;
  };

  it('are rejected by default', async () => {
    const r = await verify(sign(legacy()));
    assert.deepEqual(r, {ok: false, error: 'invalid_token'});
  });

  it('are accepted with SSO_ALLOW_LEGACY_AUD=1', async () => {
    const r = await verify(sign(legacy()), {allowLegacyAud: true});
    assert.ok(r.ok);
  });

  it('still fail closed without SSO_EXPECTED_AUD', async () => {
    const r = await verify(sign(legacy()), {allowLegacyAud: true, expectedOrigin: null});
    assert.deepEqual(r, {ok: false, error: 'sso_not_configured'});
  });

  it('only cover the plain-string aud shape', async () => {
    const r = await verify(sign({...legacy(), aud: ['hirac', 'https://elsewhere.test']}), {allowLegacyAud: true});
    assert.deepEqual(r, {ok: false, error: 'invalid_token'});
  });

  it('still require exp', async () => {
    const c = legacy();
    delete c.exp;
    const r = await verify(sign(c), {allowLegacyAud: true});
    assert.deepEqual(r, {ok: false, error: 'invalid_token'});
  });
});

describe('HS256 pin and signature', () => {
  it('rejects alg none / RS256 / HS512', async () => {
    for (const alg of ['none', 'RS256', 'HS512', 'hs256']) {
      const r = await verify(sign(claims(), {header: {alg, typ: 'JWT'}}));
      assert.deepEqual(r, {ok: false, error: 'invalid_token'}, alg);
    }
  });

  it('rejects an unsigned token', async () => {
    const [h, p] = sign(claims()).split('.');
    assert.equal((await verify(`${h}.${p}.`)).ok, false);
  });

  it('rejects a wrong secret', async () => {
    const r = await verify(sign(claims(), {secret: 'some-other-secret-0123456789'}));
    assert.deepEqual(r, {ok: false, error: 'invalid_token'});
  });

  it('rejects a tampered payload', async () => {
    const [h, , s] = sign(claims()).split('.');
    const r = await verify(`${h}.${b64(claims({username: 'admin'}))}.${s}`);
    assert.deepEqual(r, {ok: false, error: 'invalid_token'});
  });

  it('rejects crit headers and non-JWT typ', async () => {
    assert.equal((await verify(sign(claims(), {header: {alg: 'HS256', crit: ['x']}}))).ok, false);
    assert.equal((await verify(sign(claims(), {header: {alg: 'HS256', typ: 'JWE'}}))).ok, false);
  });

  it('rejects non-canonical base64url signatures', async () => {
    const t = sign(claims());
    assert.equal((await verify(`${t}=`)).ok, false);
    // A 32-byte signature leaves 2 unused bits in its last char; flipping one decodes to the same bytes.
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const last = alphabet.indexOf(t[t.length - 1]);
    const malleable = t.slice(0, -1) + alphabet[last ^ 1];
    const [, , sig] = malleable.split('.');
    assert.deepEqual(Buffer.from(sig, 'base64url'), Buffer.from(t.split('.')[2], 'base64url'));
    assert.equal((await verify(malleable)).ok, false);
  });

  it('does not fall back to portal HTTP when a local secret is set', async () => {
    let called = false;
    const portal: PortalHttpVerify = async () => {
      called = true;
      return {ok: true, value: {username: 'jdoe', id: '42'}};
    };
    const r = await verify(sign(claims(), {secret: 'some-other-secret-0123456789'}), {}, {portal});
    assert.equal(r.ok, false);
    assert.equal(called, false);
  });
});

describe('expiry and TTL', () => {
  it('requires exp, iat and jti on origin-bound tokens', async () => {
    for (const k of ['exp', 'iat', 'jti']) {
      const c = claims();
      delete c[k];
      const r = await verify(sign(c));
      assert.deepEqual(r, {ok: false, error: 'invalid_token'}, k);
    }
  });

  it('rejects expired tokens beyond 30s skew', async () => {
    assert.ok((await verify(sign(claims({iat: NOW - 80, exp: NOW - 20})))).ok);
    const r = await verify(sign(claims({iat: NOW - 100, exp: NOW - 40})));
    assert.deepEqual(r, {ok: false, error: 'token_expired'});
  });

  it(`rejects lifetimes over ${SSO_MAX_TOKEN_TTL_SECONDS}s`, async () => {
    const r = await verify(sign(claims({exp: NOW + SSO_MAX_TOKEN_TTL_SECONDS + 1})));
    assert.deepEqual(r, {ok: false, error: 'invalid_token'});
  });

  it('rejects iat / nbf in the future', async () => {
    assert.equal((await verify(sign(claims({iat: NOW + 120, exp: NOW + 150})))).ok, false);
    assert.equal((await verify(sign(claims({nbf: NOW + 120})))).ok, false);
  });

  it('rejects malformed jti', async () => {
    for (const jti of ['short', 'a'.repeat(129), 'has space here', 42]) {
      assert.equal((await verify(sign(claims({jti})))).ok, false, String(jti));
    }
  });
});

describe('jti one-time use', () => {
  it('rejects a replay of the same token', async () => {
    const store = new SharedStore();
    const t = sign(claims());
    assert.ok((await verify(t, {}, {store})).ok);
    assert.deepEqual(await verify(t, {}, {store}), {ok: false, error: 'replayed_token'});
  });

  it('fails closed when the store errors', async () => {
    const store: SsoJtiStore = {
      consume: async () => {
        throw new Error('table missing');
      },
    };
    assert.deepEqual(await verify(sign(claims()), {}, {store}), {ok: false, error: 'sso_unavailable'});
  });

  it('does not consume a jti for a token that fails other checks', async () => {
    const store = new SharedStore();
    await verify(sign(claims({targetApp: 'ehs'})), {}, {store});
    assert.equal(store.seen.size, 0);
  });

  it('interim mode (no store) still validates jti presence', async () => {
    assert.ok((await verify(sign(claims()), {}, {store: null})).ok);
    const c = claims();
    delete c.jti;
    assert.equal((await verify(sign(c), {}, {store: null})).ok, false);
  });
});

describe('portal HTTP path (no local secret)', () => {
  const ok: PortalHttpVerify = async () => ({ok: true, value: {username: 'jdoe', id: 42}});

  it('enforces origin before calling the portal', async () => {
    let called = false;
    const portal: PortalHttpVerify = async (...args) => {
      called = true;
      return ok(...args);
    };
    const r = await verify(sign(claims({aud: 'hirac'})), {secret: null}, {portal});
    assert.equal(r.ok, false);
    assert.equal(called, false);
  });

  it('accepts when the portal confirms the same user', async () => {
    assert.ok((await verify(sign(claims()), {secret: null}, {portal: ok})).ok);
  });

  it('rejects when the portal user differs from the token claims', async () => {
    const portal: PortalHttpVerify = async () => ({ok: true, value: {username: 'someone', id: 42}});
    assert.deepEqual(await verify(sign(claims()), {secret: null}, {portal}), {ok: false, error: 'invalid_token'});
  });

  it('passes portal errors through', async () => {
    const portal: PortalHttpVerify = async () => ({ok: false, error: 'invalid_token'});
    assert.deepEqual(await verify(sign(claims()), {secret: null}, {portal}), {ok: false, error: 'invalid_token'});
  });
});

describe('env parsing', () => {
  it('normalises SSO_EXPECTED_AUD and rejects junk', () => {
    assert.equal(normalizeOrigin('https://hirac.iscoutapp.co/'), ORIGIN);
    assert.equal(normalizeOrigin('https://HIRAC.iscoutapp.co'), ORIGIN);
    assert.equal(normalizeOrigin('https://hirac.iscoutapp.co/login'), null);
    assert.equal(normalizeOrigin('hirac.iscoutapp.co'), null);
    assert.equal(normalizeOrigin('javascript:alert(1)'), null);
    assert.equal(normalizeOrigin(''), null);
    assert.equal(normalizeOrigin(undefined), null);
  });

  it('defaults legacy off and requires an explicit "1"', () => {
    assert.equal(readSsoPolicyFromEnv({SSO_EXPECTED_AUD: ORIGIN}, 'hirac').allowLegacyAud, false);
    assert.equal(readSsoPolicyFromEnv({SSO_ALLOW_LEGACY_AUD: 'true'}, 'hirac').allowLegacyAud, false);
    assert.equal(readSsoPolicyFromEnv({SSO_ALLOW_LEGACY_AUD: '1'}, 'hirac').allowLegacyAud, true);
  });

  it('treats an unset or blank secret as absent (portal verify path)', () => {
    for (const env of [{}, {ISCOUT_JWT_SECRET: ''}, {ISCOUT_JWT_SECRET: '   '}]) {
      const p = readSsoPolicyFromEnv(env, 'hirac');
      assert.equal(p.secret, null);
      assert.equal(p.secretInvalid, false);
    }
    assert.equal(readSsoPolicyFromEnv({}, 'hirac').expectedOrigin, null);
  });

  it('flags a set-but-short secret as invalid', () => {
    const p = readSsoPolicyFromEnv({ISCOUT_JWT_SECRET: 'short'}, 'hirac');
    assert.equal(p.secret, null);
    assert.equal(p.secretInvalid, true);
    assert.equal(readSsoPolicyFromEnv({ISCOUT_JWT_SECRET: SECRET}, 'hirac').secretInvalid, false);
  });

  it('fails closed on a short secret instead of falling back to portal verify', async () => {
    let called = false;
    const portal: PortalHttpVerify = async () => {
      called = true;
      return {ok: true, value: {username: 'jdoe', id: '42'}};
    };
    const p = readSsoPolicyFromEnv({ISCOUT_JWT_SECRET: 'short', SSO_EXPECTED_AUD: ORIGIN}, 'hirac');
    const r = await verifySsoTokenWith(sign(claims(), {secret: 'short'}), {
      policy: p,
      jtiStore: null,
      portalVerify: portal,
      nowSec: NOW,
    });
    assert.deepEqual(r, {ok: false, error: 'sso_not_configured'});
    assert.equal(called, false);
  });
});

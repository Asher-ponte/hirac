import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {SignJWT} from 'jose';
import {
  MIN_SESSION_SECRET_LENGTH,
  SESSION_SECRET_ENV,
  SessionConfigError,
  createSessionToken,
  getSessionKey,
  hasRole,
  isAdmin,
  readSessionToken,
  verifySessionToken,
} from './session.ts';
import {SESSION_MAX_AGE_SECONDS, sessionCookieOptions} from './sso-helpers.ts';

const user = {
  id: '42',
  username: 'jdoe',
  email: 'jdoe@example.com',
  fullname: 'J Doe',
  role: 'Safety Officer',
  siteId: 'main',
};

function b64url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function freshSecret(): string {
  return randomBytes(32).toString('hex');
}

const enc = (s: string) => new TextEncoder().encode(s);

describe('session secret (fail closed)', () => {
  it('rejects a missing, short or blank secret', () => {
    assert.throws(() => getSessionKey({}), SessionConfigError);
    assert.throws(
      () => getSessionKey({[SESSION_SECRET_ENV]: 'x'.repeat(MIN_SESSION_SECRET_LENGTH - 1)}),
      SessionConfigError
    );
    assert.throws(() => getSessionKey({[SESSION_SECRET_ENV]: ' '.repeat(64)}), SessionConfigError);
  });

  it('rejects reuse of the portal JWT secret', () => {
    const secret = freshSecret();
    assert.throws(
      () => getSessionKey({[SESSION_SECRET_ENV]: secret, ISCOUT_JWT_SECRET: secret}),
      SessionConfigError
    );
  });

  it('accepts a long dedicated secret', () => {
    assert.ok(getSessionKey({[SESSION_SECRET_ENV]: freshSecret()}) instanceof Uint8Array);
  });

  it('treats every cookie as signed-out when the secret is missing', async () => {
    const secret = freshSecret();
    const token = await createSessionToken(user, enc(secret));
    assert.equal(await readSessionToken(token, {}), null);
    assert.ok(await readSessionToken(token, {[SESSION_SECRET_ENV]: secret}));
  });
});

describe('signed session token', () => {
  let secret: string;
  let key: Uint8Array;
  beforeEach(() => {
    secret = freshSecret();
    key = enc(secret);
  });

  it('round-trips a valid session', async () => {
    const now = Date.now();
    const token = await createSessionToken(user, key, now);
    const session = await verifySessionToken(token, key, now);
    assert.ok(session);
    assert.equal(session.id, '42');
    assert.equal(session.username, 'jdoe');
    assert.equal(session.role, 'Safety Officer');
    assert.equal(session.expiresAt - session.createdAt, SESSION_MAX_AGE_SECONDS * 1000);
  });

  it('rejects a forged legacy unsigned JSON cookie', async () => {
    const forged = JSON.stringify({id: '1', username: 'x', role: 'Admin', expiresAt: Date.now() + 1e6});
    assert.equal(await verifySessionToken(forged, key), null);
    assert.equal(await verifySessionToken(encodeURIComponent(forged), key), null);
  });

  it('rejects an unsigned alg=none token', async () => {
    const now = Math.floor(Date.now() / 1000);
    const forged = [
      b64url(JSON.stringify({alg: 'none', typ: 'JWT'})),
      b64url(
        JSON.stringify({sub: '1', username: 'x', role: 'Admin', iss: 'hirac', aud: 'hirac-session', iat: now, exp: now + 60})
      ),
      '',
    ].join('.');
    assert.equal(await verifySessionToken(forged, key), null);
  });

  it('rejects a tampered payload (role escalation) under the original signature', async () => {
    const token = await createSessionToken(user, key);
    const [header, payload, sig] = token.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    claims.role = 'Admin';
    const tampered = [header, b64url(JSON.stringify(claims)), sig].join('.');
    assert.equal(await verifySessionToken(tampered, key), null);
  });

  it('rejects a tampered signature', async () => {
    const token = await createSessionToken(user, key);
    const [header, payload, sig] = token.split('.');
    const bytes = Buffer.from(sig, 'base64url');
    bytes[0] ^= 0x01;
    assert.equal(await verifySessionToken([header, payload, b64url(bytes)].join('.'), key), null);
    assert.equal(await verifySessionToken([header, payload, ''].join('.'), key), null);
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await createSessionToken(user, enc(freshSecret()));
    assert.equal(await verifySessionToken(token, key), null);
  });

  it('rejects an expired token', async () => {
    const issued = Date.now() - (SESSION_MAX_AGE_SECONDS + 60) * 1000;
    const token = await createSessionToken(user, key, issued);
    assert.equal(await verifySessionToken(token, key), null);
  });

  it('rejects tokens with the wrong issuer, audience, algorithm or an over-long lifetime', async () => {
    const now = Math.floor(Date.now() / 1000);
    const base = {username: 'x', role: 'Admin'};
    const sign = (alg: string, iss: string, aud: string, exp = now + 60) =>
      new SignJWT(base).setProtectedHeader({alg}).setSubject('1').setIssuer(iss).setAudience(aud).setIssuedAt(now).setExpirationTime(exp).sign(key);

    assert.equal(await verifySessionToken(await sign('HS256', 'iscout-sso', 'hirac-session'), key), null);
    assert.equal(await verifySessionToken(await sign('HS256', 'hirac', 'hirac'), key), null);
    assert.equal(await verifySessionToken(await sign('HS512', 'hirac', 'hirac-session'), key), null);
    assert.equal(
      await verifySessionToken(await sign('HS256', 'hirac', 'hirac-session', now + SESSION_MAX_AGE_SECONDS * 10), key),
      null
    );
    assert.ok(await verifySessionToken(await sign('HS256', 'hirac', 'hirac-session'), key));
  });

  it('refuses to mint a session without a user id or username', async () => {
    await assert.rejects(createSessionToken({...user, id: ''}, key));
    await assert.rejects(createSessionToken({...user, username: ' '}, key));
  });
});

describe('roles', () => {
  it('matches roles case-insensitively and only grants admin to Admin', () => {
    assert.equal(isAdmin({role: 'Admin'}), true);
    assert.equal(isAdmin({role: 'admin'}), true);
    assert.equal(isAdmin({role: 'User'}), false);
    assert.equal(isAdmin({role: 'Safety Officer'}), false);
    assert.equal(hasRole({role: 'Viewer'}, 'Admin', 'Viewer'), true);
  });
});

describe('session cookie options', () => {
  const prev = process.env.NODE_ENV;
  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = prev;
  });

  it('is HttpOnly, Secure, SameSite=Lax with a bounded lifetime', () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    const opts = sessionCookieOptions();
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.secure, true);
    assert.equal(opts.sameSite, 'lax');
    assert.equal(opts.maxAge, SESSION_MAX_AGE_SECONDS);
  });
});

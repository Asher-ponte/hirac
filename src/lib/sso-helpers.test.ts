import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  HIRAC_SSO_APP_ID,
  getIscoutSsoApiBase,
  loginErrorPath,
  parseSessionValue,
  portalSsoErrorMessage,
  sanitizeSsoRedirect,
} from './sso-helpers.ts';

describe('sanitizeSsoRedirect', () => {
  it('defaults empty to /', () => {
    assert.equal(sanitizeSsoRedirect(null), '/');
    assert.equal(sanitizeSsoRedirect(''), '/');
    assert.equal(sanitizeSsoRedirect('dashboard'), '/');
  });

  it('allows same-origin relative paths', () => {
    assert.equal(sanitizeSsoRedirect('/'), '/');
    assert.equal(sanitizeSsoRedirect('/hirac'), '/hirac');
    assert.equal(sanitizeSsoRedirect('/admin?tab=users'), '/admin?tab=users');
  });

  it('rejects open redirects', () => {
    assert.equal(sanitizeSsoRedirect('https://evil.example/phish'), '/');
    assert.equal(sanitizeSsoRedirect('//evil.example'), '/');
    assert.equal(sanitizeSsoRedirect('/\\evil.example'), '/');
    assert.equal(sanitizeSsoRedirect('/foo\\bar'), '/');
  });
});

describe('portal SSO contract', () => {
  it('uses the portal-registered app id', () => {
    assert.equal(HIRAC_SSO_APP_ID, 'hirac');
  });

  it('maps production HIRAC error copy', () => {
    assert.match(portalSsoErrorMessage('no_token') || '', /missing a token/);
    assert.match(portalSsoErrorMessage('token_expired') || '', /Open HIRAC again/);
    assert.match(portalSsoErrorMessage('invalid_token') || '', /rejected/);
    assert.match(portalSsoErrorMessage('weird') || '', /Try again from the iScout portal/);
  });

  it('builds login error paths without a token query', () => {
    assert.equal(loginErrorPath('no_token'), '/login?error=no_token');
    assert.ok(!loginErrorPath('no_token').includes('token='));
  });

  it('defaults verify origin to the portal host in production', () => {
    const prev = process.env.NODE_ENV;
    const prevBase = process.env.ISCOUT_BASE_URL;
    process.env.NODE_ENV = 'production';
    delete process.env.ISCOUT_BASE_URL;
    assert.equal(getIscoutSsoApiBase(), 'https://iscoutapp.co');
    process.env.NODE_ENV = prev;
    if (prevBase === undefined) delete process.env.ISCOUT_BASE_URL;
    else process.env.ISCOUT_BASE_URL = prevBase;
  });
});

describe('parseSessionValue', () => {
  it('rejects missing or expired sessions', () => {
    assert.equal(parseSessionValue(undefined), null);
    assert.equal(parseSessionValue('not-json'), null);
    assert.equal(
      parseSessionValue(
        JSON.stringify({
          id: '1',
          username: 'a',
          email: null,
          fullname: 'A',
          role: 'User',
          siteId: 'main',
          createdAt: 1,
          lastActivity: 1,
          expiresAt: Date.now() - 1000,
        })
      ),
      null
    );
  });
});

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  HIRAC_SSO_APP_ID,
  getIscoutSsoApiBase,
  clearedCookieOptions,
  loginErrorPath,
  sessionCookieOptions,
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

  it('rejects control-character and whitespace bypasses that browsers strip', () => {
    // URLSearchParams has already percent-decoded these, e.g. `/%09/evil.com` arrives as `/\t/evil.com`.
    for (const ch of ['\t', '\n', '\r', '\0', ' ', '\x0b', '\x0c', '\x1f', '\x7f']) {
      assert.equal(sanitizeSsoRedirect(`/${ch}/evil.example`), '/', JSON.stringify(ch));
      assert.equal(sanitizeSsoRedirect(`${ch}//evil.example`), '/', JSON.stringify(ch));
      assert.equal(sanitizeSsoRedirect(`/hirac${ch}`), '/', JSON.stringify(ch));
    }
    assert.equal(sanitizeSsoRedirect(decodeURIComponent('/%09/evil.example')), '/');
  });

  it('rejects any // and other off-origin forms', () => {
    assert.equal(sanitizeSsoRedirect('/hirac//evil'), '/');
    assert.equal(sanitizeSsoRedirect('///evil.example'), '/');
    assert.equal(sanitizeSsoRedirect('/\\/evil.example'), '/');
    assert.equal(sanitizeSsoRedirect('javascript:alert(1)'), '/');
    assert.equal(sanitizeSsoRedirect('/x'.repeat(2000)), '/');
  });

  it('rejects percent-encoded control characters, slashes and backslashes at any depth', () => {
    for (const v of [
      '/%09/evil.example',
      '/%2509/evil.example',
      '/%252509/evil.example',
      '/%2F%2Fevil.example',
      '/%252F%252Fevil.example',
      '/%5Cevil.example',
      '/%255cevil.example',
      '/%00',
      '/%7f',
      '/hirac%20x',
      '/%25%32%46%25%32%46evil.example',
    ]) {
      assert.equal(sanitizeSsoRedirect(v), '/', v);
    }
  });

  it('rejects undecodable or too-deeply-encoded values', () => {
    assert.equal(sanitizeSsoRedirect('/%E0%A4%A'), '/');
    assert.equal(sanitizeSsoRedirect('/%zz'), '/');
    assert.equal(sanitizeSsoRedirect('/%2525252541'), '/');
  });

  it('still allows benign encodings', () => {
    assert.equal(sanitizeSsoRedirect('/hirac?q=a%2Cb'), '/hirac?q=a%2Cb');
    assert.equal(sanitizeSsoRedirect('/hirac?q=%2541'), '/hirac?q=%2541');
  });

  it('normalises dot segments without leaving the origin', () => {
    assert.equal(sanitizeSsoRedirect('/a/../hirac'), '/hirac');
    assert.equal(sanitizeSsoRedirect('/../../hirac'), '/hirac');
    assert.equal(sanitizeSsoRedirect('/%2e%2e/admin'), '/admin');
    assert.equal(sanitizeSsoRedirect('/hirac#top'), '/hirac#top');
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

describe('clearedCookieOptions', () => {
  it('matches the live cookie attributes with maxAge 0', () => {
    assert.deepEqual(clearedCookieOptions(), {...sessionCookieOptions(), maxAge: 0});
    assert.equal(clearedCookieOptions().secure, true);
    assert.equal(clearedCookieOptions().httpOnly, true);
    assert.equal(clearedCookieOptions().sameSite, 'lax');
  });
});

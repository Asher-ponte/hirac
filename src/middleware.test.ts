import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {before, describe, it} from 'node:test';
import {NextRequest} from 'next/server';
import {middleware} from './middleware.ts';
import {createSessionToken} from './lib/session.ts';
import {SESSION_COOKIE} from './lib/sso-helpers.ts';

const ORIGIN = 'http://localhost:3000';
let key: Uint8Array;

function request(path: string, cookie?: string, extraHeaders: Record<string, string> = {}) {
  const headers = new Headers(extraHeaders);
  if (cookie !== undefined) headers.set('cookie', `${SESSION_COOKIE}=${encodeURIComponent(cookie)}`);
  return new NextRequest(new URL(path, ORIGIN), {headers});
}

function token(role: string) {
  return createSessionToken(
    {id: '7', username: 'tester', email: null, fullname: 'Tester', role, siteId: 'main'},
    key
  );
}

function redirectTarget(res: Response): string | null {
  const location = res.headers.get('location');
  return location ? new URL(location).pathname : null;
}

describe('middleware session verification', () => {
  before(() => {
    const secret = randomBytes(32).toString('hex');
    process.env.HIRAC_SESSION_SECRET = secret;
    key = new TextEncoder().encode(secret);
  });

  it('redirects to /login without a session', async () => {
    assert.equal(redirectTarget(await middleware(request('/hirac'))), '/login');
  });

  it('rejects a forged unsigned cookie and clears it', async () => {
    const res = await middleware(request('/admin', JSON.stringify({id: '1', username: 'x', role: 'Admin'})));
    assert.equal(redirectTarget(res), '/login');
    assert.match(res.headers.get('set-cookie') || '', new RegExp(`${SESSION_COOKIE}=;`));
  });

  it('hands server action calls with a legacy cookie to the action guard instead of a 307', async () => {
    const legacy = JSON.stringify({id: '1', username: 'x', role: 'Admin', expiresAt: Date.now() + 1e6});
    const res = await middleware(request('/hirac', legacy, {'next-action': 'abc123'}));
    assert.equal(res.headers.get('location'), null);
    assert.notEqual(res.status, 307);
    assert.match(res.headers.get('set-cookie') || '', new RegExp(`${SESSION_COOKIE}=;`));
  });

  it('rejects a tampered signature', async () => {
    const [h, p, s] = (await token('Admin')).split('.');
    const bad = [h, p, s.slice(0, -2) + (s.endsWith('AA') ? 'BB' : 'AA')].join('.');
    assert.equal(redirectTarget(await middleware(request('/hirac', bad))), '/login');
  });

  it('lets a valid session through', async () => {
    const res = await middleware(request('/hirac', await token('Viewer')));
    assert.equal(res.headers.get('location'), null);
  });

  it('keeps non-admins out of /admin', async () => {
    assert.equal(redirectTarget(await middleware(request('/admin', await token('Viewer')))), '/');
    const res = await middleware(request('/admin', await token('Admin')));
    assert.equal(res.headers.get('location'), null);
  });

  it('fails closed when the secret is missing', async () => {
    const valid = await token('Admin');
    const saved = process.env.HIRAC_SESSION_SECRET;
    delete process.env.HIRAC_SESSION_SECRET;
    try {
      assert.equal(redirectTarget(await middleware(request('/hirac', valid))), '/login');
    } finally {
      process.env.HIRAC_SESSION_SECRET = saved;
    }
  });
});

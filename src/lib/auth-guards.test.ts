import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {before, beforeEach, describe, it} from 'node:test';
import {createSessionToken} from './session.ts';
import {SESSION_COOKIE} from './sso-helpers.ts';

type Globals = {__testCookies?: Record<string, string>; __dbCalls?: number};
const g = globalThis as Globals;

type ActionFn = (...args: unknown[]) => Promise<unknown>;
type ActionModule = Record<string, unknown>;

const ADMIN_ONLY = new Set([
  'admin.getUsers',
  'admin.upsertUser',
  'admin.deleteUser',
  'admin.upsertDepartment',
  'admin.deleteDepartment',
]);

const SAMPLE_ARGS: Record<string, unknown[]> = {
  'admin.upsertUser': [{name: 'n', email: 'e@example.com', role: 'Viewer'}],
  'admin.deleteUser': [1],
  'admin.upsertDepartment': [{name: 'd'}],
  'admin.deleteDepartment': [1],
  'hirac.createHiracEntry': [{departmentId: 1, controlMeasures: []}],
  'hirac.updateHiracEntry': [1, {departmentId: 1, controlMeasures: []}],
  'hirac.deleteHiracEntry': [1],
  'hirac.updateResidualRisk': [1, {residualLikelihood: 1, residualSeverity: 1}],
  'hirac.updateHiracOrder': [[1, 2]],
};

let actions: Array<{name: string; fn: ActionFn}> = [];
let sessionKey: Uint8Array;

async function tokenFor(role: string) {
  return createSessionToken(
    {id: '7', username: 'tester', email: null, fullname: 'Tester', role, siteId: 'main'},
    sessionKey
  );
}

function setCookie(value: string | undefined) {
  g.__testCookies = value === undefined ? {} : {[SESSION_COOKIE]: value};
}

async function expectDenied(name: string, fn: ActionFn, code: 'unauthenticated' | 'forbidden') {
  const before = g.__dbCalls ?? 0;
  await assert.rejects(
    fn(...(SAMPLE_ARGS[name] ?? [])),
    (err: unknown) => err instanceof Error && err.name === 'AuthError' && (err as {code?: string}).code === code,
    `${name} should be rejected with ${code}`
  );
  assert.equal(g.__dbCalls ?? 0, before, `${name} must not reach the database`);
}

async function expectAllowed(name: string, fn: ActionFn) {
  const before = g.__dbCalls ?? 0;
  try {
    await fn(...(SAMPLE_ARGS[name] ?? []));
  } catch (err) {
    assert.notEqual((err as Error)?.name, 'AuthError', `${name} should pass the auth guard`);
  }
  assert.ok((g.__dbCalls ?? 0) > before, `${name} should reach the database once authorized`);
}

describe('server action guards', () => {
  before(async () => {
    const secret = randomBytes(32).toString('hex');
    process.env.HIRAC_SESSION_SECRET = secret;
    sessionKey = new TextEncoder().encode(secret);

    const modules: Record<string, ActionModule> = {
      app: await import('../app/(app)/actions.ts'),
      admin: await import('../app/(app)/admin/actions.ts'),
      dashboard: await import('../app/(app)/dashboard/actions.ts'),
      hirac: await import('../app/(app)/hirac/actions.ts'),
    };
    actions = Object.entries(modules).flatMap(([mod, exports]) =>
      Object.entries(exports)
        .filter(([, value]) => typeof value === 'function')
        .map(([key, value]) => ({name: `${mod}.${key}`, fn: value as ActionFn}))
    );
    assert.ok(actions.length >= 15, 'expected to discover every exported server action');
    for (const name of ADMIN_ONLY) {
      assert.ok(actions.some(a => a.name === name), `${name} should be exported`);
    }
  });

  beforeEach(() => {
    g.__dbCalls = 0;
  });

  it('blocks every action when there is no session cookie', async () => {
    setCookie(undefined);
    for (const {name, fn} of actions) await expectDenied(name, fn, 'unauthenticated');
  });

  it('blocks every action with a forged unsigned cookie', async () => {
    setCookie(JSON.stringify({id: '1', username: 'x', role: 'Admin'}));
    for (const {name, fn} of actions) await expectDenied(name, fn, 'unauthenticated');
  });

  it('blocks every action with a tampered signature', async () => {
    const [h, p, s] = (await tokenFor('Admin')).split('.');
    setCookie([h, p, s.slice(0, -2) + (s.endsWith('AA') ? 'BB' : 'AA')].join('.'));
    for (const {name, fn} of actions) await expectDenied(name, fn, 'unauthenticated');
  });

  it('blocks every action when the server secret is missing (fail closed)', async () => {
    setCookie(await tokenFor('Admin'));
    const saved = process.env.HIRAC_SESSION_SECRET;
    delete process.env.HIRAC_SESSION_SECRET;
    try {
      for (const {name, fn} of actions) await expectDenied(name, fn, 'unauthenticated');
    } finally {
      process.env.HIRAC_SESSION_SECRET = saved;
    }
  });

  it('blocks non-admin users from admin actions but allows the rest', async () => {
    for (const role of ['User', 'Safety Officer', 'Viewer']) {
      setCookie(await tokenFor(role));
      for (const {name, fn} of actions) {
        if (ADMIN_ONLY.has(name)) await expectDenied(name, fn, 'forbidden');
        else await expectAllowed(name, fn);
      }
    }
  });

  it('allows admins through every action', async () => {
    setCookie(await tokenFor('Admin'));
    for (const {name, fn} of actions) await expectAllowed(name, fn);
  });
});

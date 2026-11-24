import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {lazyAsyncSingleton} from './lazy-singleton.ts';

describe('lazyAsyncSingleton', () => {
  it('calls the factory once on success and shares the result', async () => {
    let calls = 0;
    const get = lazyAsyncSingleton(async () => ++calls);
    const [a, b] = await Promise.all([get(), get()]);
    assert.equal(a, 1);
    assert.equal(b, 1);
    assert.equal(await get(), 1);
    assert.equal(calls, 1);
  });

  it('retries after a rejected attempt instead of caching the failure', async () => {
    let calls = 0;
    const get = lazyAsyncSingleton(async () => {
      calls++;
      if (calls === 1) throw new Error('connect failed');
      return 'db';
    });
    await assert.rejects(get(), /connect failed/);
    assert.equal(await get(), 'db');
    assert.equal(await get(), 'db');
    assert.equal(calls, 2);
  });

  it('shares an in-flight attempt, including its rejection', async () => {
    let calls = 0;
    let fail!: (e: Error) => void;
    const get = lazyAsyncSingleton(
      () =>
        new Promise<string>((_resolve, reject) => {
          calls++;
          fail = reject;
        })
    );
    const p1 = get();
    const p2 = get();
    assert.equal(p1, p2);
    fail(new Error('boom'));
    await assert.rejects(p1, /boom/);
    await assert.rejects(p2, /boom/);
    assert.equal(calls, 1);
  });

  it('does not leave an unhandled rejection behind', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);
    const get = lazyAsyncSingleton(async () => {
      throw new Error('x');
    });
    await get().catch(() => {});
    await new Promise((r) => setImmediate(r));
    process.off('unhandledRejection', onUnhandled);
    assert.deepEqual(unhandled, []);
  });
});

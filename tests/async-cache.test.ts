import test from 'node:test';
import assert from 'node:assert/strict';
import { createAsyncCache } from '../src/lib/async-cache';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test('concurrent settings reads share one request and expire after three seconds', async (t) => {
  let now = 0;
  t.mock.method(Date, 'now', () => now);
  let reads = 0;
  const pending = deferred<boolean>();
  const cache = createAsyncCache(() => {
    reads++;
    return pending.promise;
  }, 3000);
  const requests = Array.from({ length: 20 }, () => cache.get());
  assert.equal(reads, 1);
  pending.resolve(true);
  assert.deepEqual(await Promise.all(requests), Array(20).fill(true));
  now = 2999;
  assert.equal(await cache.get(), true);
  assert.equal(reads, 1);
  now = 3000;
  assert.equal(cache.peek(), undefined);
  await cache.get();
  assert.equal(reads, 2);
});

test('failed settings reads reject all waiters and the next request retries', async () => {
  const pending = deferred<boolean>();
  let reads = 0;
  const cache = createAsyncCache(() => {
    reads++;
    return reads === 1 ? pending.promise : Promise.resolve(true);
  }, 3000);
  const first = assert.rejects(cache.get(), /Unavailable/);
  const second = assert.rejects(cache.get(), /Unavailable/);
  pending.reject(new Error('Unavailable'));
  await Promise.all([first, second]);
  assert.equal(cache.peek(), undefined);
  assert.equal(await cache.get(), true);
  assert.equal(reads, 2);
});

test('clearing settings prevents an older in-flight response from repopulating the cache', async () => {
  const old = deferred<boolean>();
  let reads = 0;
  const cache = createAsyncCache(() => {
    reads++;
    return reads === 1 ? old.promise : Promise.resolve(true);
  }, 3000);
  const stale = cache.get();
  cache.clear();
  assert.equal(await cache.get(), true);
  old.resolve(false);
  assert.equal(await stale, false);
  assert.equal(cache.peek(), true);
  assert.equal(await cache.get(), true);
  assert.equal(reads, 2);
});

test('a forced refresh supersedes a pending read without accepting its stale result', async () => {
  const old = deferred<string>();
  let reads = 0;
  const cache = createAsyncCache(() => {
    reads++;
    return reads === 1 ? old.promise : Promise.resolve('current');
  }, 3000);
  const stale = cache.get();
  assert.equal(await cache.get(true), 'current');
  old.resolve('old');
  await stale;
  assert.equal(await cache.get(), 'current');
  assert.equal(reads, 2);
});

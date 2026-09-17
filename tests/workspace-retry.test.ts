import test from 'node:test';
import assert from 'node:assert/strict';
import { AccountRequestError } from '../src/lib/auth-client';
import { retryWorkspaceOperation } from '../src/lib/workspace-retry';

test('Safari network failures retry and return the confirmed response', async () => {
  let attempts = 0;
  const result = await retryWorkspaceOperation(async () => {
    if (++attempts === 1) throw new TypeError('Load failed');
    return 'confirmed';
  });
  assert.equal(attempts, 2);
  assert.equal(result, 'confirmed');
});

test('persistent network failures are bounded and produce an actionable save error', async () => {
  let attempts = 0;
  await assert.rejects(
    retryWorkspaceOperation(async () => {
      attempts++;
      throw new TypeError('Failed to fetch');
    }),
    /connection was interrupted.*retry saving/i,
  );
  assert.equal(attempts, 3);
});

test('temporary server failures retry without hiding validation, quota, session or cancellation errors', async () => {
  let attempts = 0;
  await retryWorkspaceOperation(async () => {
    if (++attempts < 2) throw new AccountRequestError(502, 'Temporary gateway failure');
  });
  assert.equal(attempts, 2);
  for (const error of [
    new AccountRequestError(400, 'Invalid document'),
    new AccountRequestError(401, 'Sign in'),
    new AccountRequestError(403, 'Forbidden'),
    new AccountRequestError(404, 'Session expired'),
    new AccountRequestError(409, 'Storage full or revision conflict'),
    new AccountRequestError(413, 'Too large'),
    new AccountRequestError(429, 'Rate limited'),
    new DOMException('Cancelled', 'AbortError'),
    new TypeError('An unrelated programming error'),
  ]) {
    let calls = 0;
    await assert.rejects(
      retryWorkspaceOperation(async () => {
        calls++;
        throw error;
      }),
      (actual) => actual === error,
    );
    assert.equal(calls, 1);
  }
});

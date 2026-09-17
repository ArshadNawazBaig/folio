import test from 'node:test';
import assert from 'node:assert/strict';
import { retryTransientRequest } from '../src/lib/request-retry';

test('cancelling during retry backoff prevents another preview request', async () => {
  const controller = new AbortController();
  let calls = 0;
  const pending = retryTransientRequest(async () => {
    calls++;
    throw new TypeError('Load failed');
  }, controller.signal);
  setTimeout(() => controller.abort(), 10);
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(calls, 1);
});

test('an already cancelled preview never sends a request', async () => {
  let calls = 0;
  await assert.rejects(
    retryTransientRequest(async () => ++calls, AbortSignal.abort()),
    {
      name: 'AbortError',
    },
  );
  assert.equal(calls, 0);
});

test('a network failure while reading response bytes retries the complete read', async () => {
  let calls = 0;
  const bytes = await retryTransientRequest(async () => {
    const response = new Response(
      ++calls === 1
        ? new ReadableStream({
            start(controller) {
              controller.error(new TypeError('Load failed'));
            },
          })
        : 'complete response',
    );
    return response.text();
  });
  assert.equal(calls, 2);
  assert.equal(bytes, 'complete response');
});

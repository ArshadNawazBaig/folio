import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  InteractiveTextPreview,
  inspectInteractiveText,
  interactiveTextPreview,
} from '../src/lib/interactive-text-preview';

class PreviewWorker {
  static latest: PreviewWorker;
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  messages: { type: string; id?: number }[] = [];
  terminated = false;
  constructor() {
    PreviewWorker.latest = this;
  }
  postMessage(message: { type: string; id?: number }) {
    this.messages.push(message);
  }
  terminate() {
    this.terminated = true;
  }
  emit(data: unknown) {
    this.onmessage?.({ data });
  }
}

const source = new Uint8Array([37, 80, 68, 70]);
const inspection = { pageCount: 1, blocks: [] };
const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};
function setup(t: TestContext) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  Object.defineProperty(globalThis, 'Worker', { configurable: true, value: PreviewWorker });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fetch = t.mock.method(globalThis, 'fetch', async (url: string, init: RequestInit) => {
    assert.equal(url, '/api/pro/preview');
    assert.equal(init.method, 'POST');
    assert.equal(init.signal?.aborted, false);
    return Response.json(inspection);
  });
  const client = new InteractiveTextPreview(source);
  t.after(() => {
    client.dispose();
    if (original) Object.defineProperty(globalThis, 'Worker', original);
    else Reflect.deleteProperty(globalThis, 'Worker');
  });
  return { client, worker: PreviewWorker.latest, fetch };
}

test('a healthy browser taking over 350 ms never uploads a duplicate inspection', async (t) => {
  const { client, worker, fetch } = setup(t);
  const result = inspectInteractiveText(
    client,
    source,
    'private.pdf',
    0,
    new AbortController().signal,
  );
  worker.emit({ ready: true });
  await settle();
  t.mock.timers.tick(1000);
  await settle();
  assert.equal(fetch.mock.callCount(), 0);
  worker.emit({
    id: worker.messages.find((message) => message.type === 'job')!.id,
    result: inspection,
  });
  assert.deepEqual(await result, inspection);
  assert.equal(fetch.mock.callCount(), 0);
});

test('slow browser previews and their cached results need no server processing', async (t) => {
  const { client, worker, fetch } = setup(t);
  const job = { operation: 'preview', page: 0, changes: [] };
  const signal = new AbortController().signal;
  const result = interactiveTextPreview(client, source, 'private.pdf', job, signal);
  worker.emit({ ready: true });
  await settle();
  t.mock.timers.tick(1500);
  await settle();
  assert.equal(fetch.mock.callCount(), 0);
  const image = { preview: 'png', width: 600, height: 800 };
  worker.emit({ id: worker.messages.find((message) => message.type === 'job')!.id, result: image });
  assert.deepEqual(await result, image);
  assert.deepEqual(await interactiveTextPreview(client, source, 'private.pdf', job, signal), image);
  assert.equal(worker.messages.filter((message) => message.type === 'job').length, 1);
  assert.equal(fetch.mock.callCount(), 0);
});

test('unavailable browser processing falls back immediately', async (t) => {
  const { client, worker, fetch } = setup(t);
  const result = inspectInteractiveText(
    client,
    source,
    'private.pdf',
    0,
    new AbortController().signal,
  );
  worker.emit({ unavailable: true });
  assert.deepEqual(await result, inspection);
  assert.equal(fetch.mock.callCount(), 1);
  assert.ok(worker.terminated);
});

for (const ready of [false, true]) {
  test(`a stuck browser ${ready ? 'job' : 'startup'} is terminated before server fallback`, async (t) => {
    const { client, worker, fetch } = setup(t);
    const result = inspectInteractiveText(
      client,
      source,
      'private.pdf',
      0,
      new AbortController().signal,
    );
    if (ready) worker.emit({ ready: true });
    await settle();
    t.mock.timers.tick(7999);
    await settle();
    assert.equal(fetch.mock.callCount(), 0);
    t.mock.timers.tick(1);
    assert.deepEqual(await result, inspection);
    assert.equal(fetch.mock.callCount(), 1);
    assert.ok(worker.terminated);
  });
}

test('cancelling or superseding a local job never triggers an upload', async (t) => {
  const { client, worker, fetch } = setup(t);
  const controller = new AbortController();
  const result = inspectInteractiveText(client, source, 'private.pdf', 0, controller.signal);
  worker.emit({ ready: true });
  await settle();
  controller.abort();
  await assert.rejects(result, { name: 'AbortError' });
  t.mock.timers.tick(8000);
  await settle();
  assert.equal(fetch.mock.callCount(), 0);
  await assert.rejects(
    inspectInteractiveText(null, source, 'private.pdf', 0, AbortSignal.abort()),
    { name: 'AbortError' },
  );
  assert.equal(fetch.mock.callCount(), 0);
});

test('browsers without a local worker can still use server inspection', async (t) => {
  const { fetch } = setup(t);
  assert.deepEqual(
    await inspectInteractiveText(null, source, 'private.pdf', 0, new AbortController().signal),
    inspection,
  );
  assert.equal(fetch.mock.callCount(), 1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkspaceSync, type SyncStatus } from '../src/lib/workspace-sync';
import type { WorkspaceSnapshot } from '../src/lib/workspace-types';

const original: WorkspaceSnapshot = {
  state: {
    pages: [{ id: 'page-1', sourceIndex: 0, rotation: 0, width: 595, height: 842 }],
    annotations: [],
    formValues: {},
  },
  inspection: null,
  page: 0,
  mode: 'text',
  flatten: false,
};
const edited: WorkspaceSnapshot = {
  ...original,
  state: {
    ...original.state,
    annotations: [
      {
        id: 'text-1',
        pageId: 'page-1',
        kind: 'text',
        text: 'Keep this text',
        x: 20,
        y: 20,
        width: 120,
        height: 30,
        size: 18,
        color: '#202522',
        opacity: 1,
      },
    ],
  },
};
const restored = {
  revision: 1,
  name: 'Example.pdf',
  snapshot: original,
  updatedAt: new Date().toISOString(),
  expiresAt: null,
};

test('a manual save arriving as the previous flush completes still writes the new text', async (t) => {
  let stored = original;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    stored = body.snapshot;
    return Response.json({
      revision: body.revision + 1,
      updatedAt: restored.updatedAt,
      expiresAt: null,
    });
  });
  const sync = new WorkspaceSync('workspace', new Uint8Array(), () => {}, restored);
  t.after(() => sync.dispose());
  sync.update(restored.name, original);
  const finishing = sync.flush();
  sync.update(restored.name, edited);
  await sync.flush();
  assert.deepEqual(
    stored,
    edited,
    'Success must include the text present when Save now was pressed',
  );
  await finishing;
});

test('a stopped save queue cannot report a successful manual save', async () => {
  const sync = new WorkspaceSync('workspace', new Uint8Array(), () => {}, restored);
  sync.update(restored.name, edited);
  sync.dispose();
  await assert.rejects(sync.flush(), /no longer active/i);
});

test('reconnecting the queue preserves its confirmed revision and still saves pending text', async (t) => {
  let stored = original;
  let revision = restored.revision;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    assert.equal(body.revision, revision);
    stored = body.snapshot;
    revision++;
    return Response.json({ revision, updatedAt: restored.updatedAt, expiresAt: null });
  });
  const sync = new WorkspaceSync('workspace', new Uint8Array(), () => {}, restored);
  t.after(() => sync.dispose());
  sync.update(restored.name, edited);
  await sync.flush();
  sync.dispose();
  const next = {
    ...edited,
    state: {
      ...edited.state,
      annotations: edited.state.annotations.map((a) => ({ ...a, text: 'Edited again' })),
    },
  };
  sync.update(restored.name, next);
  sync.resume();
  await sync.flush();
  assert.deepEqual(stored, next);
  assert.equal(revision, 3);
});

test('a restored upload without a snapshot writes its initial editable state', async (t) => {
  let stored: WorkspaceSnapshot | null = null;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    stored = body.snapshot;
    return Response.json({
      revision: body.revision + 1,
      updatedAt: restored.updatedAt,
      expiresAt: null,
    });
  });
  const sync = new WorkspaceSync('workspace', new Uint8Array(), () => {}, {
    ...restored,
    snapshot: null,
    revision: 0,
  });
  t.after(() => sync.dispose());
  sync.update(restored.name, edited);
  await sync.flush();
  assert.deepEqual(stored, edited);
});

test('manual verification accepts JSONB key ordering but rejects missing text', async (t) => {
  let loseText = false;
  // PostgreSQL JSONB need not use the application's property insertion order.
  const reordered = JSON.parse(
    JSON.stringify(edited, (_key, value) =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).reverse())
        : value,
    ),
  );
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({
      ...restored,
      snapshot: loseText ? original : reordered,
    }),
  );
  const sync = new WorkspaceSync('workspace', new Uint8Array(), () => {}, {
    ...restored,
    snapshot: edited,
  });
  t.after(() => sync.dispose());
  sync.update(restored.name, edited);
  await sync.flush(true);
  loseText = true;
  await assert.rejects(sync.flush(true), /saved edits could not be verified/i);
});

test('saving with shared source inspection keeps current edits and verifies recovered source blocks', async (t) => {
  const inspection: NonNullable<WorkspaceSnapshot['inspection']> = {
    pageCount: 1,
    skipped: 0,
    blocks: [
      {
        id: '0:0',
        page: 0,
        objectIndex: 0,
        text: 'Original text',
        font: 'Helvetica',
        replacementFont: 'Helvetica',
        size: 12,
        color: '#000000',
        bounds: [20, 20, 120, 32],
      },
    ],
  };
  const initial = { ...original, inspection };
  const next = { ...edited, inspection };
  let stored: WorkspaceSnapshot = initial;
  let revision = restored.revision;
  let loseInspection = false;
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      const body = JSON.parse(init.body as string);
      stored = body.snapshot;
      revision++;
      return Response.json({ revision, updatedAt: restored.updatedAt, expiresAt: null });
    }
    // Fresh server objects cannot reuse the cache for the browser's source data.
    const recovered = JSON.parse(
      JSON.stringify(stored, (_key, value) =>
        value && typeof value === 'object' && !Array.isArray(value)
          ? Object.fromEntries(Object.entries(value).reverse())
          : value,
      ),
    );
    if (loseInspection) recovered.inspection.blocks = [];
    return Response.json({ ...restored, revision, snapshot: recovered });
  });
  const sync = new WorkspaceSync('workspace', new Uint8Array(), () => {}, {
    ...restored,
    snapshot: initial,
  });
  t.after(() => sync.dispose());
  sync.update(restored.name, initial);
  sync.update(restored.name, next);
  await sync.flush(true);
  assert.deepEqual(stored, next);
  sync.update(restored.name, initial);
  await sync.flush(true);
  assert.deepEqual(stored, initial, 'Undo must persist even with the same source inspection');
  loseInspection = true;
  await assert.rejects(sync.flush(true), /saved edits could not be verified/i);
});

test('an invalid storage acknowledgement does not mark new text saved', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ success: true }));
  const statuses: SyncStatus[] = [];
  const sync = new WorkspaceSync(
    'workspace',
    new Uint8Array(),
    (status) => statuses.push(status),
    restored,
  );
  t.after(() => sync.dispose());
  sync.update(restored.name, edited);
  await assert.rejects(sync.flush(), /did not confirm this save/i);
  assert.equal(statuses.at(-1)?.phase, 'error');
});

test('undo during an in-flight write stays unsaved until the undo also reaches storage', async (t) => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const sending = new Promise<void>((resolve) => {
    started = resolve;
  });
  let stored = original;
  const statuses: SyncStatus[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    started();
    await blocked;
    stored = body.snapshot;
    return Response.json({
      revision: body.revision + 1,
      updatedAt: restored.updatedAt,
      expiresAt: null,
    });
  });
  const sync = new WorkspaceSync(
    'workspace',
    new Uint8Array(),
    (status) => statuses.push(status),
    restored,
  );
  t.after(() => {
    release();
    sync.dispose();
  });
  sync.update(restored.name, edited);
  const saving = sync.flush();
  await sending;
  sync.update(restored.name, original);
  assert.notEqual(statuses.at(-1)?.phase, 'saved');
  release();
  await saving;
  assert.deepEqual(stored, original);
});

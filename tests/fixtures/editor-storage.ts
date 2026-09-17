import { test as base, expect, type BrowserContext } from '@playwright/test';
import type { WorkspaceSnapshot } from '../../src/lib/workspace-types';
import { PAGE_SIZE } from '../../src/lib/pagination.mjs';
import { FREE_STORAGE_LIMIT } from '../../src/lib/cloud-types';
type FileRecord = {
  id: string;
  name: string;
  revision: number;
  snapshot: WorkspaceSnapshot | null;
  bytes: Buffer | null;
  expiresAt: string | null;
  updatedAt: string;
  writeId?: string;
  size?: number;
  deleting?: boolean;
};
export async function mockWorkspaceStorage(context: BrowserContext) {
  const records = new Map<string, FileRecord>();
  const uploadBodies = new Map<string, Buffer>();
  // WebKit's interception protocol omits multipart file bytes. Capture the
  // actual browser File for the intercepted storage route before sending the request.
  await context.exposeBinding('__folioWorkspaceUpload', (_source, id: string, bytes: number[]) => {
    uploadBodies.set(id, Buffer.from(bytes));
  });
  await context.addInitScript(() => {
    const original = window.fetch;
    window.fetch = async (input, init) => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
        window.location.href,
      );
      if (
        url.origin === window.location.origin &&
        url.pathname.startsWith('/__test-workspace-storage/') &&
        init?.method === 'PUT' &&
        init.body instanceof FormData
      ) {
        const file = init.body.get('');
        if (file instanceof Blob)
          await (
            window as unknown as {
              __folioWorkspaceUpload: (id: string, bytes: number[]) => Promise<void>;
            }
          ).__folioWorkspaceUpload(
            url.pathname.split('/').pop()!,
            Array.from(new Uint8Array(await file.arrayBuffer())),
          );
      }
      return original.call(window, input, init);
    };
  });
  const service = {
    records,
    uploads: 0,
    saves: 0,
    failUploads: false,
    failSaves: false,
    failUploadConnections: 0,
    dropSaveResponses: 0,
    failDeletes: false,
    accountFull: false,
    dropEdits: false,
    holdSave: null as Promise<void> | null,
  };
  await context.route('**/__test-workspace-storage/**', async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop()!;
    const file = records.get(id);
    if (!file) {
      await route.fulfill({ status: 404 });
      return;
    }
    if (route.request().method() === 'PUT') {
      if (service.failUploadConnections > 0) {
        service.failUploadConnections--;
        await route.abort('failed');
        return;
      }
      if (service.failUploads) {
        await route.fulfill({ status: 503 });
        return;
      }
      file.bytes = uploadBodies.get(id) || null;
      expect(file.bytes?.length).toBe(file.size);
      service.uploads++;
      await route.fulfill({ json: { Key: id } });
    } else
      await route.fulfill({ body: file.bytes || Buffer.alloc(0), contentType: 'application/pdf' });
  });
  await context.route('**/api/workspaces{,?**,/**}', async (route) => {
    const request = route.request();
    expect(request.headers()['x-folio-workspace']).toBe('1');
    const id = new URL(request.url()).pathname.split('/')[3];
    if (id === 'session') {
      // Exercise the real guest cookie endpoint; account tokens belong to the auth fixture.
      if (request.headers().authorization) await route.fulfill({ json: { guest: false } });
      else await route.continue();
      return;
    }
    const sessionHeaders: Record<string, string> =
      !request.headers().authorization &&
      !request.headers().cookie?.includes('folio-workspace-session=')
        ? {
            'set-cookie': `folio-workspace-session=${'a'.repeat(64)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
          }
        : {};
    const guests = () =>
      [...records.values()].filter(
        (file) => file.expiresAt && Date.parse(file.expiresAt) > Date.now(),
      );
    if (id === 'claim' && request.method() === 'POST') {
      expect(request.headers().authorization).toContain('Bearer ');
      let claimed = 0;
      for (const file of guests()) {
        if (!service.accountFull && !file.deleting) {
          file.expiresAt = null;
          claimed++;
        }
      }
      await route.fulfill({ json: { claimed, remaining: guests().length } });
      return;
    }
    if (!id && request.method() === 'GET') {
      const files = guests().map((file) => ({
        id: file.id,
        name: file.name,
        size: file.size || file.bytes?.length || 0,
        workspace_size: file.snapshot ? Buffer.byteLength(JSON.stringify(file.snapshot)) : 0,
        workspace_revision: file.revision,
        status: file.deleting ? 'deleting' : file.bytes ? 'ready' : 'pending',
        created_at: file.updatedAt,
        updated_at: file.updatedAt,
        expires_at: file.expiresAt,
        guest: true,
      }));
      const query = new URL(request.url()).searchParams;
      const page = Number(query.get('page') || 1),
        pageSize = Number(query.get('pageSize') || PAGE_SIZE),
        search = query.get('q') || '',
        sort = query.get('sort') || 'recent';
      const filtered = files
        .filter((file) => file.name.toLowerCase().includes(search.toLowerCase()))
        .sort(
          (a, b) =>
            (sort === 'name'
              ? a.name.localeCompare(b.name)
              : sort === 'size'
                ? b.size - a.size
                : Date.parse(b.updated_at) - Date.parse(a.updated_at)) || a.id.localeCompare(b.id),
        );
      const used = files.reduce((total, file) => total + file.size + file.workspace_size, 0);
      await route.fulfill({
        headers: sessionHeaders,
        json: {
          files: filtered.slice((page - 1) * pageSize, page * pageSize),
          total: filtered.length,
          readyCount: files.filter((file) => file.status === 'ready').length,
          storage: {
            used,
            limit: FREE_STORAGE_LIMIT,
            available: Math.max(0, FREE_STORAGE_LIMIT - used),
            full: used >= FREE_STORAGE_LIMIT,
            recovery: [],
          },
        },
      });
      return;
    }
    if (request.method() === 'POST') {
      const body = request.postDataJSON();
      if (!records.has(body.id))
        records.set(body.id, {
          id: body.id,
          name: body.name,
          size: body.size,
          revision: 0,
          snapshot: null,
          bytes: null,
          expiresAt: request.headers().authorization
            ? null
            : new Date(Date.now() + 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        });
      await route.fulfill({
        headers: sessionHeaders,
        json: {
          id: body.id,
          ready: !!records.get(body.id)?.bytes,
          uploadUrl: new URL(`/__test-workspace-storage/${body.id}`, request.url()).href,
        },
      });
      return;
    }
    const file = records.get(id);
    if (!file) {
      await route.fulfill({
        status: 404,
        json: { error: 'This document is unavailable or its guest session has expired.' },
      });
      return;
    }
    if (request.method() === 'GET') {
      if (file.expiresAt && Date.parse(file.expiresAt) <= Date.now()) {
        await route.fulfill({ status: 404, json: { error: 'This guest workspace has expired.' } });
        return;
      }
      await route.fulfill({
        json: {
          ...file,
          bytes: undefined,
          status: 'ready',
          sourceUrl: new URL(`/__test-workspace-storage/${id}`, request.url()).href,
        },
      });
      return;
    }
    if (request.method() === 'DELETE') {
      file.deleting = true;
      if (service.failDeletes) {
        await route.fulfill({
          status: 503,
          json: { error: 'This file could not be fully removed. Please retry removing it.' },
        });
      } else {
        records.delete(id);
        await route.fulfill({ json: { removed: true } });
      }
      return;
    }
    const body = request.postDataJSON();
    if (body.action === 'rename') {
      file.name = body.name.replace(/\.pdf$/i, '') + '.pdf';
      file.revision++;
      await route.fulfill({ json: { renamed: true } });
      return;
    }
    if (body.action === 'claim') {
      file.expiresAt = null;
      await route.fulfill({ json: { claimed: true } });
      return;
    }
    if (body.action === 'finish') {
      await route.fulfill({
        status: file.bytes ? 200 : 409,
        json: { ready: !!file.bytes, error: 'Upload incomplete' },
      });
      return;
    }
    if (service.holdSave) await service.holdSave;
    if (service.failSaves) {
      await route.fulfill({ status: 503, json: { error: 'Storage temporarily unavailable.' } });
      return;
    }
    if (body.writeId !== file.writeId) {
      if (body.revision !== file.revision) {
        await route.fulfill({
          status: 409,
          json: { error: 'This document changed in another tab. Your current edits remain here.' },
        });
        return;
      }
      file.name = body.name;
      if (!service.dropEdits) file.snapshot = body.snapshot;
      file.revision++;
      file.writeId = body.writeId;
      file.updatedAt = new Date().toISOString();
      service.saves++;
    }
    if (service.dropSaveResponses > 0) {
      service.dropSaveResponses--;
      await route.abort('failed');
      return;
    }
    await route.fulfill({
      json: { revision: file.revision, updatedAt: file.updatedAt, expiresAt: file.expiresAt },
    });
  });
  return service;
}
export const test = base.extend<{
  workspaceStorage: Awaited<ReturnType<typeof mockWorkspaceStorage>>;
}>({
  workspaceStorage: [
    async ({ context }, use) => {
      await use(await mockWorkspaceStorage(context));
    },
    { auto: true },
  ],
});
export { expect };

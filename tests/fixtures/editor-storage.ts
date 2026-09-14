import { test as base, expect, type BrowserContext } from '@playwright/test';
import type { WorkspaceSnapshot } from '../../src/lib/workspace-types';
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
  const service = {
    records,
    uploads: 0,
    saves: 0,
    failUploads: false,
    failSaves: false,
    failDeletes: false,
    accountFull: false,
    dropEdits: false,
    holdSave: null as Promise<void> | null,
  };
  await context.route('https://folio-workspace-tests.example.test/**', async (route) => {
    const id = new URL(route.request().url()).pathname.slice(1);
    const file = records.get(id);
    if (!file) {
      await route.fulfill({ status: 404 });
      return;
    }
    if (route.request().method() === 'PUT') {
      if (service.failUploads) {
        await route.fulfill({ status: 503 });
        return;
      }
      const request = new Request(route.request().url(), {
        method: 'PUT',
        headers: route.request().headers(),
        body: new Uint8Array(route.request().postDataBuffer()!),
      });
      const form = await request.formData();
      file.bytes = Buffer.from(await (form.get('') as File).arrayBuffer());
      service.uploads++;
      await route.fulfill({ json: { Key: id } });
    } else
      await route.fulfill({ body: file.bytes || Buffer.alloc(0), contentType: 'application/pdf' });
  });
  await context.route('**/api/workspaces{,/**}', async (route) => {
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
      const used = files.reduce((total, file) => total + file.size + file.workspace_size, 0);
      await route.fulfill({
        headers: sessionHeaders,
        json: {
          files,
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
          uploadUrl: `https://folio-workspace-tests.example.test/${body.id}`,
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
          sourceUrl: `https://folio-workspace-tests.example.test/${id}`,
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

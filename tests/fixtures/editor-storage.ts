import { test as base, expect, type BrowserContext } from '@playwright/test';
import type { WorkspaceSnapshot } from '../../src/lib/workspace-types';
type FileRecord = {
  id: string;
  name: string;
  revision: number;
  snapshot: WorkspaceSnapshot | null;
  bytes: Buffer | null;
  expiresAt: string | null;
  updatedAt: string;
  writeId?: string;
};
export async function mockWorkspaceStorage(context: BrowserContext) {
  const records = new Map<string, FileRecord>();
  const service = {
    records,
    uploads: 0,
    saves: 0,
    failUploads: false,
    failSaves: false,
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
    if (request.method() === 'POST') {
      const body = request.postDataJSON();
      if (!records.has(body.id))
        records.set(body.id, {
          id: body.id,
          name: body.name,
          revision: 0,
          snapshot: null,
          bytes: null,
          expiresAt: request.headers().authorization
            ? null
            : new Date(Date.now() + 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        });
      await route.fulfill({
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
    const body = request.postDataJSON();
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

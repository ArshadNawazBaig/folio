import { test, expect } from './fixtures/editor-storage';
import { disableBrowserTextPreview } from './fixtures/text-preview-worker';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const { browserAsset } = JSON.parse(
  await readFile(new URL('../src/lib/pdfium-asset.json', import.meta.url), 'utf8'),
) as { browserAsset: string };

test('the browser decompresses the cached text engine to the exact library bytes', async ({
  page,
}) => {
  await page.goto('/workspace');
  const received = await page.evaluate(async (url) => {
    const response = await fetch(url);
    const bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return {
      status: response.status,
      encoding: response.headers.get('content-encoding'),
      cache: response.headers.get('cache-control'),
      transmitted: Number(response.headers.get('content-length')),
      size: bytes.byteLength,
      hash: [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, '0')).join(''),
    };
  }, browserAsset);
  const original = await readFile('node_modules/@embedpdf/pdfium/dist/pdfium.wasm');
  expect(received.status).toBe(200);
  expect(received.encoding).toBe('gzip');
  expect(received.cache).toContain('immutable');
  expect(received.transmitted).toBeGreaterThan(0);
  expect(received.transmitted).toBeLessThan(original.length / 2);
  expect(received.size).toBe(original.length);
  expect(received.hash).toBe(createHash('sha256').update(original).digest('hex'));
});

test('saved original text stays editable when its preview connection is interrupted after refresh', async ({
  page,
}) => {
  await disableBrowserTextPreview(page);
  await page.goto('/workspace?sample=proposal');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const target = page.getByRole('button', { name: 'Edit text: A place to', exact: true });
  const input = page.getByRole('textbox', { name: 'Edit original text: A place to', exact: true });
  await target.click();
  await input.fill('Recovered original text');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  let interrupted = false;
  await page.route('**/api/pro/preview', async (route) => {
    if (!interrupted) {
      interrupted = true;
      await route.abort('connectionreset');
    } else await route.continue();
  });
  await page.reload();
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  expect(interrupted).toBe(true);
  await target.click();
  await expect(input).toHaveValue('Recovered original text');
  await input.fill('Still editable after recovery');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  await page.reload();
  await target.click();
  await expect(input).toHaveValue('Still editable after recovery');
});

test('an interrupted upload recovers automatically and retains edits after refresh', async ({
  page,
  workspaceStorage,
}) => {
  workspaceStorage.failUploadConnections = 1;
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  expect(workspaceStorage.failUploadConnections).toBe(0);
  expect(workspaceStorage.records.size).toBe(1);
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  await page
    .getByRole('textbox', { name: 'Edit added text', exact: true })
    .fill('Recovered upload');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  await page.reload();
  await expect(page.locator('.annotation-text')).toContainText('Recovered upload');
});

test('a dropped response after committing a save is retried without duplicating the write', async ({
  page,
  workspaceStorage,
}) => {
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  const writes = workspaceStorage.saves;
  workspaceStorage.dropSaveResponses = 1;
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  await page
    .getByRole('textbox', { name: 'Edit added text', exact: true })
    .fill('Confirmed recovery');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  expect(workspaceStorage.dropSaveResponses).toBe(0);
  expect(workspaceStorage.records.size).toBe(1);
  expect(workspaceStorage.saves).toBeGreaterThan(writes);
  const confirmedWrites = workspaceStorage.saves;
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  expect(workspaceStorage.saves).toBe(confirmedWrites);
  await page.reload();
  await expect(page.locator('.annotation-text')).toContainText('Confirmed recovery');
});

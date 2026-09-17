import { PDFDocument, StandardFonts } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { processTextPdf } from '../scripts/pdf-text-engine.mjs';
import type { TextInspection } from '../src/lib/pro-types';
import { test, expect } from './fixtures/editor-storage';

async function source() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([500, 400]).drawText('Original receipt 123', { x: 50, y: 300, size: 20, font });
  return Buffer.from(await pdf.save());
}
test('font search loads on demand and saves original text styles through refresh', async ({
  page,
  workspaceStorage,
}) => {
  const fontRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/fonts/file')) fontRequests.push(request.url());
  });
  await page.goto('/workspace');
  await page
    .locator('.editor-empty input[type=file]')
    .setInputFiles({ name: 'Font test.pdf', mimeType: 'application/pdf', buffer: await source() });
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: Original receipt 123', exact: true }).click();
  const input = page.getByRole('textbox', {
    name: 'Edit original text: Original receipt 123',
    exact: true,
  });
  await input.fill('Updated receipt 1234');
  await input.press('Enter');
  expect(fontRequests).toHaveLength(0);
  await page.locator('.font-picker .dropdown-trigger').first().click();
  await page.getByRole('combobox', { name: 'Search fonts', exact: true }).fill('Lora');
  const option = page.getByRole('option', { name: /^Lora / });
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.locator('.font-picker .dropdown-trigger').first()).toHaveText('Lora');
  await page.getByRole('combobox', { name: 'Font weight', exact: true }).click();
  await page.getByRole('option', { name: 'Bold', exact: true }).click();
  await page.getByRole('combobox', { name: 'Font style', exact: true }).click();
  await page.getByRole('option', { name: 'Italic', exact: true }).click();
  await expect(page.locator('.inline-text-value')).toHaveCSS(
    'font-family',
    /FolioDoc_lora_700_italic/,
  );
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect
    .poll(
      () =>
        [...workspaceStorage.records.values()][0]?.snapshot?.state.textChanges?.['page-0']?.['0:0']
          ?.font,
    )
    .toBe('google:lora:700:italic');
  await page.reload();
  await page.getByRole('button', { name: 'Edit text: Original receipt 123', exact: true }).click();
  await expect(input).toHaveValue('Updated receipt 1234');
  await expect(input).toHaveCSS('font-family', /FolioDoc_lora_700_italic/);
  await expect(input).toHaveCSS('font-weight', '700');
  await expect(input).toHaveCSS('font-style', 'italic');
  await input.fill('Still editable 5678');
  expect(fontRequests.length).toBeLessThan(10);
});

test('picker supports keyboard search, empty results and failed font recovery', async ({
  page,
}) => {
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Font failure.pdf',
    mimeType: 'application/pdf',
    buffer: await source(),
  });
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: Original receipt 123', exact: true }).click();
  await page.locator('.font-picker .dropdown-trigger').first().click();
  const search = page.getByRole('combobox', { name: 'Search fonts', exact: true });
  await search.fill('no-such-font-family');
  await expect(page.getByText('No fonts found. Try a different name.')).toBeVisible();
  await page.route('**/api/fonts/file?*', (route) =>
    route.fulfill({ status: 503, json: { error: 'Unavailable' } }),
  );
  await search.fill('Pacifico');
  await expect(page.getByRole('option', { name: /^Pacifico / })).toBeVisible();
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page.getByText(/Your current font is unchanged/)).toBeVisible();
  await expect(page.locator('.font-picker .dropdown-trigger').first()).toContainText('Original');
  await page.unroute('**/api/fonts/file?*');
  await page.getByRole('button', { name: 'Retry font library' }).click();
  await search.fill('Pacifico');
  await page.getByRole('option', { name: /^Pacifico / }).click();
  await expect(page.locator('.font-picker .dropdown-trigger').first()).toHaveText('Pacifico');
});

test('font endpoints are cacheable and reject invalid styles', async ({ request }) => {
  const catalog = await request.get('/api/fonts?q=Roboto');
  expect(catalog.ok()).toBeTruthy();
  expect(catalog.headers()['cache-control']).toContain('public');
  expect(
    (await catalog.json()).fonts.some((font: { family: string }) => font.family === 'Roboto'),
  ).toBeTruthy();
  const file = await request.get('/api/fonts/file?font=google%3Alora%3A700%3Aitalic');
  expect(file.ok()).toBeTruthy();
  expect(file.headers()['content-type']).toBe('font/ttf');
  expect(file.headers()['cache-control']).toContain('public');
  expect((await file.body()).readUInt32BE(0)).toBe(0x00010000);
  expect(
    (await request.get('/api/fonts/file?font=google%3Apacifico%3A700%3Aitalic')).status(),
  ).toBe(400);
});

test('added text keeps its Google font through save, refresh, and a free PDF download', async ({
  page,
  workspaceStorage,
}) => {
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Added fonts.pdf',
    mimeType: 'application/pdf',
    buffer: await source(),
  });
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 100, y: 220 } });
  const added = page.getByRole('textbox', { name: 'Edit added text', exact: true });
  await added.fill('A note in Roboto');
  await added.press('Escape');
  await page.getByRole('combobox', { name: 'Text font', exact: true }).click();
  await page.getByRole('combobox', { name: 'Search fonts', exact: true }).fill('Roboto');
  await page.getByRole('option', { name: /^Roboto \d/ }).click();
  await page.getByRole('combobox', { name: 'Font weight', exact: true }).click();
  await page.getByRole('option', { name: 'Medium', exact: true }).click();
  await expect(page.locator('.annotation-content')).toHaveCSS(
    'font-family',
    /FolioDoc_roboto_500_normal/,
  );
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect
    .poll(() => [...workspaceStorage.records.values()][0]?.snapshot?.state.annotations[0]?.font)
    .toBe('google:roboto:500:normal');
  await page.reload();
  await expect(page.locator('.annotation-content')).toHaveCSS(
    'font-family',
    /FolioDoc_roboto_500_normal/,
  );
  await page.locator('.annotation-text').click();
  await added.fill('Saved with Roboto 5678');
  await added.press('Escape');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const bytes = await readFile((await (await download).path())!);
  const inspection = (await processTextPdf(bytes, { operation: 'inspect' })) as TextInspection;
  const text = inspection.blocks.find((block) => block.text.startsWith('Saved with Roboto'));
  expect(text?.text).toBe('Saved with Roboto 5678');
  expect(text?.font).toContain('Roboto-Medium');
});

test('font picker fits a mobile viewport and remains keyboard accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workspace?sample=proposal');
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 80, y: 100 } });
  await page.getByRole('textbox', { name: 'Edit added text', exact: true }).fill('Mobile font');
  await page.getByRole('textbox', { name: 'Edit added text', exact: true }).press('Escape');
  if (!(await page.getByRole('combobox', { name: 'Text font', exact: true }).isVisible()))
    await page.getByRole('button', { name: 'Toggle properties and forms' }).click();
  await page.getByRole('combobox', { name: 'Text font', exact: true }).click();
  await page.getByRole('combobox', { name: 'Search fonts', exact: true }).fill('Lora');
  const option = page.getByRole('option', { name: /^Lora / });
  await expect(option).toBeVisible();
  const box = (await page.getByRole('dialog', { name: 'Font library' }).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: '/tmp/folio-font-picker-mobile.png' });
  await option.click();
  await expect(page.getByRole('combobox', { name: 'Text font', exact: true })).toHaveText('Lora');
});

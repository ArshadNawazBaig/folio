import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PNG } from 'pngjs';
import { test, expect } from './fixtures/editor-storage';
import { processTextPdf } from '../scripts/pdf-text-engine.mjs';
import type { TextInspection } from '../src/lib/pro-types';
import { createEncodedReceiptPdf } from './fixtures/encoded-receipt-pdf';
import { defaultTextChange } from '../src/lib/editor-text';
import {
  disableBrowserTextPreview,
  observeBrowserTextPreview,
} from './fixtures/text-preview-worker';

async function coloredDocument() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const sheet = pdf.addPage([500, 400]);
  sheet.drawRectangle({ x: 0, y: 0, width: 500, height: 400, color: rgb(0.88, 0.93, 0.87) });
  sheet.drawLine({
    start: { x: 40, y: 270 },
    end: { x: 450, y: 270 },
    color: rgb(0.8, 0.2, 0.1),
    thickness: 1,
  });
  sheet.drawText('Original words must disappear', { x: 60, y: 270, font, size: 20 });
  sheet.drawText('Second editable line', { x: 60, y: 180, font, size: 20 });
  return Buffer.from(await pdf.save());
}
function pixels(buffer: Buffer) {
  const png = PNG.sync.read(buffer);
  let dark = 0,
    red = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const [r, g, b] = png.data.subarray(i, i + 3);
    if (r < 80 && g < 80 && b < 80) dark++;
    if (r > 140 && g < 100 && b < 100) red++;
  }
  return { dark, red };
}

test('only selected text moves and editing removes old ink without covering the page background', async ({
  page,
  workspaceStorage,
}) => {
  const source = await coloredDocument();
  await page.goto('/workspace');
  await page
    .locator('.editor-empty input[type=file]')
    .setInputFiles({ name: 'Colored page.pdf', mimeType: 'application/pdf', buffer: source });
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const first = page.getByRole('button', {
    name: 'Edit text: Original words must disappear',
    exact: true,
  });
  const second = page.getByRole('button', { name: 'Edit text: Second editable line', exact: true });
  const handles = page.locator('.inline-text-move');
  await first.hover();
  await expect(handles).toHaveCount(0);
  const originalBox = (await first.boundingBox())!;
  expect(pixels(await page.screenshot({ clip: originalBox })).dark).toBeGreaterThan(100);
  await first.click();
  const input = page.getByRole('textbox', {
    name: 'Edit original text: Original words must disappear',
    exact: true,
  });
  await input.fill('I');
  await input.press('Enter');
  await expect(handles).toHaveCount(1);
  await expect(handles).toHaveAttribute('aria-label', 'Move text: Original words must disappear');
  await second.hover();
  await expect(handles).toHaveCount(1);
  await expect(page.locator('.inline-text-value')).toHaveText('I');
  const tail = { ...originalBox, x: originalBox.x + 50, width: originalBox.width - 50 };
  expect(pixels(await page.screenshot({ clip: tail })).dark).toBe(0);
  const handle = (await handles.boundingBox())!;
  await page.mouse.move(handle.x + 12, handle.y + 12);
  await page.mouse.down();
  await page.mouse.move(handle.x + 92, handle.y + 52, { steps: 5 });
  // The original location is already clear during the gesture, without waiting for a request.
  const cleared = pixels(await page.screenshot({ clip: originalBox }));
  expect(cleared.dark).toBe(0);
  expect(cleared.red).toBeGreaterThan(30);
  await page.mouse.up();
  await page.locator('.editable-page').click({ position: { x: 500, y: 350 } });
  await expect(handles).toHaveCount(0);
  await expect(page.locator('.inline-text-pending')).toHaveCount(0);
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  expect(pixels(await page.screenshot({ clip: originalBox })).dark).toBe(0);
  await second.click();
  await expect(handles).toHaveCount(1);
  await expect(handles).toHaveAttribute('aria-label', 'Move text: Second editable line');
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  await expect(handles).toHaveCount(0);
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  const record = [...workspaceStorage.records.values()][0];
  const changes = Object.values(Object.values(record.snapshot!.state.textChanges!)[0]);
  const output = (await processTextPdf(source, { operation: 'edit', changes })) as Uint8Array;
  const exported = (await processTextPdf(output, { operation: 'inspect' })) as TextInspection;
  expect(exported.blocks.map((block) => block.text)).toEqual(['I', 'Second editable line']);
  await page.locator('.editable-page').screenshot({ path: '/tmp/folio-selected-text-clean.png' });
});

test('a failed background preparation cannot duplicate text and can be retried', async ({
  page,
}) => {
  await disableBrowserTextPreview(page);
  let failPreview = true;
  await page.route('**/api/pro/preview', async (route) => {
    const body = route.request().postDataBuffer()?.toString() || '';
    if (failPreview && body.includes('"operation":"preview"'))
      await route.fulfill({ status: 503, json: { error: 'Preview temporarily unavailable.' } });
    else await route.continue();
  });
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Retry.pdf',
    mimeType: 'application/pdf',
    buffer: await coloredDocument(),
  });
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page
    .getByRole('button', { name: 'Edit text: Original words must disappear', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Retry editing', exact: true })).toBeVisible();
  await expect(page.locator('.inline-text-move')).toBeDisabled();
  await expect(page.locator('.inline-text-input')).toBeHidden();
  await expect(page.locator('.inline-text-value, .inline-text-pending')).toHaveCount(0);
  failPreview = false;
  await page.getByRole('button', { name: 'Retry editing', exact: true }).click();
  await page
    .getByRole('textbox', {
      name: 'Edit original text: Original words must disappear',
      exact: true,
    })
    .fill('Recovered');
  await expect(page.locator('.inline-text-move')).toBeEnabled();
  await expect(page.locator('.inline-text-status [role=alert]')).toHaveCount(0);
});

test('returning to a text box reuses its clean background without another preview request', async ({
  page,
}) => {
  await disableBrowserTextPreview(page);
  let previews = 0;
  page.on('request', (request) => {
    if (
      request.url().endsWith('/api/pro/preview') &&
      request.postDataBuffer()?.toString().includes('"operation":"preview"')
    )
      previews++;
  });
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Cached text.pdf',
    mimeType: 'application/pdf',
    buffer: await coloredDocument(),
  });
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const target = page.getByRole('button', {
    name: 'Edit text: Original words must disappear',
    exact: true,
  });
  await target.click();
  const input = page.getByRole('textbox', {
    name: 'Edit original text: Original words must disappear',
    exact: true,
  });
  await input.fill('Updated words');
  await input.press('Enter');
  await page.locator('.editable-page').click({ position: { x: 500, y: 350 } });
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  await expect(page.locator('.inline-text-pending')).toHaveCount(0);
  const prepared = previews;
  expect(prepared).toBe(2);
  // Returning must still work with the network unavailable for further previews.
  await page.route('**/api/pro/preview', (route) => route.abort());
  await target.click();
  await expect(input).toBeVisible();
  await expect(input).toHaveValue('Updated words');
  await expect(input).toBeFocused();
  await input.fill('Instantly editable');
  await input.press('Enter');
  await expect(page.locator('.inline-text-value')).toHaveText('Instantly editable');
  expect(previews).toBe(prepared);
});

for (const failFirstPreview of [false, true])
  test(`saved encoded text recovers after refresh${failFirstPreview ? ' and a failed preview' : ''}`, async ({
    page,
    workspaceStorage,
  }) => {
    if (failFirstPreview) await disableBrowserTextPreview(page);
    const source = await createEncodedReceiptPdf();
    const inspection = (await processTextPdf(source, { operation: 'inspect' })) as TextInspection;
    const encoded = inspection.blocks.find((block) => block.text.includes('\u0002'))!;
    const other = inspection.blocks.find((block) => block.text === 'Receipt total')!;
    expect(encoded).toBeTruthy();
    await page.goto('/workspace');
    await page.locator('.editor-empty input[type=file]').setInputFiles({
      name: 'Saved receipt.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(source),
    });
    await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
    const record = [...workspaceStorage.records.values()][0];
    const snapshot = record.snapshot!;
    const pageId = snapshot.state.pages[0].id;
    snapshot.inspection = inspection;
    snapshot.mode = 'original-text';
    snapshot.state.pages.push({ ...snapshot.state.pages[0], id: 'blank-page', sourceIndex: null });
    snapshot.state.textChanges = {
      [pageId]: {
        [encoded.id]: { ...defaultTextChange(encoded), offset: { x: 30, y: -40 } },
        [other.id]: { ...defaultTextChange(other), text: 'Updated total' },
      },
    };
    let fail = failFirstPreview;
    await page.route('**/api/pro/preview', async (route) => {
      if (fail && route.request().postDataBuffer()?.toString().includes('"operation":"preview"'))
        await route.fulfill({ status: 503, json: { error: 'Preview temporarily unavailable.' } });
      else await route.continue();
    });
    await page.reload();
    if (failFirstPreview) {
      await expect(page.locator('.inline-text-status [role=alert]')).toContainText(
        'Your edits are still here.',
      );
      await expect(page.locator('.inline-preview-loading')).toHaveCount(0);
      await expect(page.locator('.editable-page canvas')).toBeVisible();
      expect(record.snapshot!.state.textChanges![pageId][other.id].text).toBe('Updated total');
      fail = false;
      await page.getByRole('button', { name: 'Retry text preview', exact: true }).click();
    }
    await expect(page.locator('.inline-pdf-preview')).toBeVisible();
    await expect(page.locator('.inline-preview-loading')).toHaveCount(0);
    await expect(page.locator('.inline-text-status [role=alert]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Edit text: Receipt total', exact: true }).click();
    const input = page.getByRole('textbox', {
      name: 'Edit original text: Receipt total',
      exact: true,
    });
    await expect(input).toHaveValue('Updated total');
    await input.fill('Restored total');
    await input.press('Enter');
    await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
    await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
      'Your document has been saved.',
    );
    await page.reload();
    await expect(page.locator('.inline-pdf-preview')).toBeVisible();
    await expect(page.locator('.inline-text-status [role=alert]')).toHaveCount(0);
    expect(record.snapshot!.state.textChanges![pageId][encoded.id].text).toBe(encoded.text);
    expect(record.snapshot!.state.textChanges![pageId][encoded.id].offset).toEqual({
      x: 30,
      y: -40,
    });
    expect(record.snapshot!.state.textChanges![pageId][other.id].text).toBe('Restored total');
  });

test('clicking new text blocks stays editable when server previews are unavailable', async ({
  page,
}) => {
  await observeBrowserTextPreview(page);
  await page.route('**/api/pro/preview', async (route) => {
    if (route.request().postDataBuffer()?.toString().includes('"operation":"preview"'))
      await route.abort();
    else await route.continue();
  });
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Browser preview.pdf',
    mimeType: 'application/pdf',
    buffer: await coloredDocument(),
  });
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const first = page.getByRole('button', {
    name: 'Edit text: Original words must disappear',
    exact: true,
  });
  await expect(first).toBeVisible();
  await page.waitForFunction(
    () => (window as Window & { textPreviewReady?: boolean }).textPreviewReady,
  );
  const originalBox = (await first.boundingBox())!;
  const started = Date.now();
  await first.click();
  const input = page.getByRole('textbox', {
    name: 'Edit original text: Original words must disappear',
    exact: true,
  });
  await expect(input).toBeFocused();
  expect(Date.now() - started).toBeLessThan(1500);
  await input.fill('I');
  await input.press('Enter');
  const tail = { ...originalBox, x: originalBox.x + 50, width: originalBox.width - 50 };
  expect(pixels(await page.screenshot({ clip: tail })).dark).toBe(0);
  await page.getByRole('button', { name: 'Edit text: Second editable line', exact: true }).click();
  const second = page.getByRole('textbox', {
    name: 'Edit original text: Second editable line',
    exact: true,
  });
  await expect(second).toBeFocused();
  await second.fill('Updated in the browser');
  await second.press('Enter');
  await page.locator('.editable-page').click({ position: { x: 500, y: 350 } });
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  await first.click();
  await expect(input).toHaveValue('I');
  await expect(input).toBeFocused();
});

import { test, expect } from './fixtures/editor-storage';
import { createReceiptNumberPdf } from './fixtures/receipt-number-pdf';
import { readFile } from 'node:fs/promises';
import { processTextPdf } from '../scripts/pdf-text-engine.mjs';
import { defaultTextChange } from '../src/lib/editor-text';
import type { TextInspection } from '../src/lib/pro-types';

for (const kind of ['standard', 'unmapped'] as const) {
  test(`receipt digit 4 renders with ${kind} font`, async ({ page }) => {
    await page.goto('/workspace');
    await page.locator('.editor-empty input[type=file]').setInputFiles({
      name: 'Receipt.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await createReceiptNumberPdf(kind)),
    });
    await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
    await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
    await page.getByRole('button', { name: 'Edit text: 000002', exact: true }).click();
    const input = page.getByRole('textbox', { name: 'Edit original text: 000002', exact: true });
    await input.fill('000004');
    await input.screenshot({ path: `/tmp/folio-digit-${kind}-typing.png` });
    await input.press('Enter');
    await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
    await page
      .locator('.editable-page')
      .screenshot({ path: `/tmp/folio-digit-${kind}-preview.png` });
  });
}

test('a Chrome receipt subset gains digit 4 in the same semibold font when typing, saving, reopening and exporting', async ({
  page,
  workspaceStorage,
}) => {
  const font = await readFile('public/fonts/pdf/GeistMono-SemiBold.ttf');
  await page.setContent(
    `<style>@font-face {font-family:Receipt;src:url(data:font/ttf;base64,${font.toString('base64')});font-weight:600}body{font-family:Receipt;font-weight:600;font-size:24pt}</style><p>000002</p>`,
  );
  await page.evaluate(() => document.fonts.ready);
  const source = await page.pdf({ width: '400px', height: '400px' });
  const inspection = (await processTextPdf(source, { operation: 'inspect' })) as TextInspection;
  const original = inspection.blocks.find((block) => block.text === '2')!;
  expect(original.fontCharacters).not.toContain('4');
  expect(original.fontWeight).toBe(600);
  await page.goto('/workspace');
  await page
    .locator('.editor-empty input[type=file]')
    .setInputFiles({ name: 'Receipt number.pdf', mimeType: 'application/pdf', buffer: source });
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const target = page.getByRole('button', { name: 'Edit text: 2', exact: true });
  await target.click();
  const input = page.getByRole('textbox', { name: 'Edit original text: 2', exact: true });
  await input.fill('4');
  await expect(input).toHaveCSS('font-family', /FolioPdf_GeistMono-SemiBold/);
  await expect(input).toHaveCSS('font-weight', '600');
  await input.screenshot({ path: '/tmp/folio-digit-geist-typing.png' });
  await input.press('Enter');
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  const record = [...workspaceStorage.records.values()][0];
  const changes = Object.values(Object.values(record.snapshot!.state.textChanges!)[0]);
  expect(changes[0].font).toBe('original');
  await page.reload();
  await target.click();
  await expect(input).toHaveValue('4');
  await expect(input).toHaveCSS('font-family', /FolioPdf_GeistMono-SemiBold/);
  await input.press('Enter');
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  const output = (await processTextPdf(source, { operation: 'edit', changes })) as Uint8Array;
  const after = (await processTextPdf(output, { operation: 'inspect' })) as TextInspection;
  expect(after.blocks.map((block) => block.text).join('')).toBe('000004');
  const edited = after.blocks.find((block) => block.text === '4')!;
  expect(edited.font).toBe('GeistMono-SemiBold');
  expect(edited.fontWeight).toBe(600);
  expect(edited.fontCharacters).toContain('4');
  // Reopening the exported PDF must still support new digits in the same font.
  await processTextPdf(output, {
    operation: 'edit',
    changes: [{ ...defaultTextChange(edited), text: '9' }],
  });
  await page.locator('.editable-page').screenshot({ path: '/tmp/folio-digit-geist-preview.png' });
});

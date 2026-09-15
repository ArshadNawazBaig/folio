import { test, expect } from './fixtures/editor-storage';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import jsQR from 'jsqr';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import AxeBuilder from '@axe-core/playwright';

const jpg = await sharp({
  create: { width: 1600, height: 800, channels: 3, background: '#ac6537' },
})
  .jpeg()
  .toBuffer();
const webp = await sharp({
  create: { width: 160, height: 80, channels: 4, background: '#00000000' },
})
  .webp()
  .toBuffer();
const png = await sharp({ create: { width: 120, height: 180, channels: 3, background: '#456789' } })
  .png()
  .toBuffer();
async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}
async function exported(page: Page, name: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  const file = await pending;
  return { bytes: await readFile((await file.path())!), name: file.suggestedFilename() };
}
test('image worker exports a resized WEBP and compares its actual pixels', async ({ page }) => {
  await page.goto('/jpg-to-webp');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: jpg });
  await choose(page, 'Image dimensions', 'Fit within 1280 pixels');
  await page.getByRole('button', { name: 'Convert to WEBP', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Processed preview of photo.jpg' })).toBeVisible();
  const file = await exported(page, 'Download image');
  const metadata = await sharp(file.bytes).metadata();
  expect(metadata.format).toBe('webp');
  expect([metadata.width, metadata.height]).toEqual([1280, 640]);
  await page.getByRole('button', { name: 'Original', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Original preview of photo.jpg' })).toBeVisible();
  await choose(page, 'Image dimensions', 'Keep original dimensions');
  await expect(page.getByRole('button', { name: 'Download image', exact: true })).toHaveCount(0);
});
test('transparent WEBP becomes white JPG and malformed image input is recoverable', async ({
  page,
}) => {
  await page.goto('/webp-to-jpg');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'alpha.webp', mimeType: 'image/webp', buffer: webp });
  await page.getByRole('button', { name: 'Convert to JPG', exact: true }).click();
  const { bytes } = await exported(page, 'Download image');
  const metadata = await sharp(bytes).metadata();
  expect(metadata.format).toBe('jpeg');
  expect([metadata.width, metadata.height]).toEqual([160, 80]);
  const pixels = await sharp(bytes).raw().toBuffer();
  expect([...pixels.subarray(0, 3)]).toEqual([255, 255, 255]);
  await page.getByRole('button', { name: 'Remove alpha.webp', exact: true }).click();
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'broken.webp',
      mimeType: 'image/webp',
      buffer: Buffer.from('invalid pixels'),
    });
  await page.getByRole('button', { name: 'Convert to JPG', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download image', exact: true })).toHaveCount(0);
});
test('batch image pagination, original-size fallback and duplicate names preserve every file', async ({
  page,
}) => {
  await page.goto('/compress-images');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(
      Array.from({ length: 11 }, () => ({ name: 'same.png', mimeType: 'image/png', buffer: png })),
    );
  await expect(page.getByRole('button', { name: 'Preview same.png', exact: true })).toHaveCount(10);
  const pagination = page.getByRole('navigation', { name: 'Image files pagination' });
  await expect(pagination).toContainText('1–10 of 11 records');
  await pagination.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preview same.png', exact: true })).toHaveCount(1);
  await choose(page, 'Records per page', '25 per page');
  await expect(page.getByRole('button', { name: 'Preview same.png', exact: true })).toHaveCount(11);
  await page.getByRole('button', { name: 'Compress images', exact: true }).click();
  const { bytes } = await exported(page, 'Download all (ZIP)');
  const zip = await JSZip.loadAsync(bytes);
  const files = Object.values(zip.files);
  expect(files).toHaveLength(11);
  for (const file of files) {
    const output = await file.async('nodebuffer');
    expect(output.length).toBeLessThanOrEqual(png.length);
    expect((await sharp(output).metadata()).width).toBe(120);
  }
});
test('image adjustments change exported pixels and reset removes stale output', async ({
  page,
}) => {
  await page.goto('/enhance-image');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'tone.png', mimeType: 'image/png', buffer: png });
  const brightness = page.getByRole('slider', { name: /Brightness/ });
  await brightness.focus();
  await page.keyboard.press('End');
  await page.getByRole('button', { name: 'Apply adjustments', exact: true }).click();
  const { bytes } = await exported(page, 'Download image');
  const pixels = await sharp(bytes).raw().toBuffer();
  expect([...pixels.subarray(0, 3)]).toEqual([0x45 + 50, 0x67 + 50, 0x89 + 50]);
  await page.getByRole('button', { name: 'Reset adjustments', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download image', exact: true })).toHaveCount(0);
});
test('merge images exports an ordered PDF with a result preview and WEBP support', async ({
  page,
}) => {
  await page.goto('/merge-images');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles([
      { name: 'first.png', mimeType: 'image/png', buffer: png },
      { name: 'second.webp', mimeType: 'image/webp', buffer: webp },
    ]);
  await expect(page.getByRole('button', { name: 'Create PDF', exact: true })).toBeEnabled();
  await choose(page, 'Page size', 'Fit each image');
  await page.getByRole('button', { name: 'Move second.webp up', exact: true }).click();
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Result preview', exact: true }).locator('canvas'),
  ).toBeVisible();
  const { bytes } = await exported(page, 'Download PDF');
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(2);
  // Fit-to-image pages use 96 image pixels per inch, expressed as 72 PDF points per inch.
  expect(doc.getPage(0).getSize()).toEqual({ width: 120, height: 60 });
  expect(doc.getPage(1).getSize()).toEqual({ width: 90, height: 135 });
  await page.getByRole('button', { name: 'Next preview page', exact: true }).click();
  await expect(page.locator('.preview-heading')).toContainText('2 / 2');
});
test('JPEG rotation metadata survives both image conversion and image-to-PDF', async ({ page }) => {
  const rotated = await sharp({
    create: { width: 60, height: 120, channels: 3, background: '#aa4411' },
  })
    .withMetadata({ orientation: 6 })
    .jpeg()
    .toBuffer();
  const input = { name: 'portrait.jpg', mimeType: 'image/jpeg', buffer: rotated };
  await page.goto('/jpg-to-webp');
  await page.locator('input[type=file]').first().setInputFiles(input);
  await page.getByRole('button', { name: 'Convert to WEBP', exact: true }).click();
  const image = await sharp((await exported(page, 'Download image')).bytes).metadata();
  expect([image.width, image.height]).toEqual([120, 60]);
  await page.goto('/jpg-to-pdf');
  await page.locator('input[type=file]').first().setInputFiles(input);
  await expect(page.getByRole('button', { name: 'Create PDF', exact: true })).toBeEnabled();
  await choose(page, 'Page size', 'Fit each image');
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  const doc = await PDFDocument.load((await exported(page, 'Download PDF')).bytes);
  expect(doc.getPage(0).getSize()).toEqual({ width: 90, height: 45 });
});
test('PDF image export produces 300 DPI JPG and ordered multi-page ZIP previews', async ({
  page,
}) => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 2; i++)
    pdf.addPage([144, 72]).drawText(`Page ${i}`, { x: 12, y: 20, font, size: 12 });
  await page.goto('/pdf-to-jpg');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'pages.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await pdf.save()),
    });
  await expect(page.getByRole('button', { name: 'Convert to JPG', exact: true })).toBeEnabled();
  await page.getByLabel('Pages', { exact: true }).fill('1');
  await choose(page, 'Resolution', 'Print — 300 DPI');
  await page.getByRole('button', { name: 'Convert to JPG', exact: true }).click();
  const { bytes } = await exported(page, 'Download JPG');
  const meta = await sharp(bytes).metadata();
  expect([meta.width, meta.height, meta.format]).toEqual([600, 300, 'jpeg']);
  expect(meta.density).toBe(300);
  await expect(
    page.getByRole('region', { name: 'Result preview', exact: true }).locator('img'),
  ).toBeVisible();
  await page.getByLabel('Pages', { exact: true }).fill('2, 1');
  await page.getByRole('button', { name: 'Convert to JPG', exact: true }).click();
  const zip = await JSZip.loadAsync((await exported(page, 'Download ZIP')).bytes);
  expect(Object.keys(zip.files)).toHaveLength(2);
  await expect(page.locator('.preview-heading')).toContainText('1 / 2');
});
test('QR exports scan correctly, invalidate after edits and fit mobile and desktop', async ({
  page,
}) => {
  await page.goto('/create-qr-code');
  await page
    .getByRole('textbox', { name: 'Website address', exact: true })
    .fill('example.com/folio');
  await page.getByRole('button', { name: 'Generate QR code', exact: true }).click();
  const { bytes } = await exported(page, 'Download PNG');
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect([info.width, info.height]).toEqual([1024, 1024]);
  expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(
    'https://example.com/folio',
  );
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    const violations = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      violations.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
  }
  await page
    .getByRole('textbox', { name: 'Website address', exact: true })
    .fill('example.com/updated');
  await expect(page.getByRole('button', { name: 'Download PNG', exact: true })).toHaveCount(0);
});
test('image workspace stays accessible and within a narrow mobile viewport', async ({ page }) => {
  await page.goto('/jpg-to-webp');
  await page.locator('input[type=file]').first().setInputFiles({
    name: 'Long filename with spaces and a description.jpg',
    mimeType: 'image/jpeg',
    buffer: jpg,
  });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    const violations = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      violations.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ).toEqual([]);
  }
});

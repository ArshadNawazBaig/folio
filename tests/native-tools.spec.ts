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
test('Wi-Fi QR validation identifies the missing password and the completed code scans', async ({
  page,
}) => {
  await page.goto('/create-qr-code');
  await choose(page, 'QR content', 'Wi-Fi network');
  await page.getByLabel('Network name', { exact: true }).fill('Office;network');
  await page.getByRole('button', { name: 'Generate QR code', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Enter the Wi-Fi password.');
  await expect(page.getByRole('button', { name: 'Download PNG', exact: true })).toHaveCount(0);
  await page.getByLabel('Network password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Generate QR code', exact: true }).click();
  const { data, info } = await sharp((await exported(page, 'Download PNG')).bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(
    'WIFI:T:WPA;S:Office\\;network;P:test-password;H:false;;',
  );
});

test('PDF text export honors page order and explains pages without selectable text', async ({
  page,
}) => {
  const pdf = await PDFDocument.create();
  for (const text of ['First section', 'Second section'])
    pdf.addPage().drawText(text, { x: 40, y: 600, size: 18 });
  await page.goto('/pdf-to-text');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'sections.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await pdf.save()),
    });
  await expect(page.getByRole('button', { name: 'Extract text', exact: true })).toBeEnabled();
  await page.getByLabel('Pages', { exact: true }).fill('2,1');
  await page.getByRole('button', { name: 'Extract text', exact: true }).click();
  const text = (await exported(page, 'Download text')).bytes.toString('utf8');
  expect(text).toMatch(/Page 2[\s\S]*Second section[\s\S]*Page 1[\s\S]*First section/);
  const blank = await PDFDocument.create();
  blank.addPage();
  await page.goto('/pdf-to-text');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'blank.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await blank.save()),
    });
  await expect(page.getByRole('button', { name: 'Extract text', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Extract text', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'No selectable text was found',
  );
  await expect(page.getByRole('button', { name: 'Download text', exact: true })).toHaveCount(0);
});

test('malformed PDF settings return an actionable validation response', async ({ request }) => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const response = await request.post('/api/pro/preview', {
    multipart: {
      file: {
        name: 'settings.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from(await pdf.save()),
      },
      job: '{broken',
    },
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ error: 'The requested PDF settings are invalid.' });
});

test('watermark rejects empty text, exports the chosen color, and invalidates an old result', async ({
  page,
}) => {
  const pdf = await PDFDocument.create();
  pdf.addPage([300, 200]);
  await page.goto('/watermark-pdf');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'blank.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await pdf.save()),
    });
  const run = page.getByRole('button', { name: 'Add watermark', exact: true });
  await expect(run).toBeEnabled();
  await page.getByLabel('Watermark text', { exact: true }).fill('');
  await run.click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Enter watermark text');
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toHaveCount(0);
  await page.getByLabel('Watermark text', { exact: true }).fill('APPROVED');
  await page.getByLabel('Text size', { exact: true }).fill('24');
  await page.getByLabel('Watermark color', { exact: true }).fill('#7436ff');
  await choose(page, 'Opacity', '60% — strong');
  await run.click();
  const result = await exported(page, 'Download PDF');
  const { processTextPdf } = await import('../scripts/pdf-text-engine.mjs');
  const inspection = await processTextPdf(new Uint8Array(result.bytes), { operation: 'inspect' });
  expect(inspection.blocks).toEqual(
    expect.arrayContaining([expect.objectContaining({ text: 'APPROVED', color: '#7436ff' })]),
  );
  await page.getByLabel('Watermark color', { exact: true }).fill('#000000');
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toHaveCount(0);
});

test('cancelling the final image packaging never publishes a stale download and can be retried', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const read = Blob.prototype.arrayBuffer;
    let imageReads = 0;
    Blob.prototype.arrayBuffer = async function () {
      if (this.type === 'image/png' && ++imageReads === 3) {
        (window as any).imagePackagingBlocked = true;
        await new Promise<void>((resolve) => {
          (window as any).releaseImagePackaging = resolve;
        });
      }
      return read.call(this);
    };
  });
  const pdf = await PDFDocument.create();
  pdf.addPage([100, 100]).drawText('Test', { size: 12, x: 10, y: 30 });
  await page.goto('/pdf-to-png');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'cancel.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await pdf.save()),
    });
  const run = page.getByRole('button', { name: 'Convert to PNG', exact: true });
  await expect(run).toBeEnabled();
  await run.click();
  await expect.poll(() => page.evaluate(() => (window as any).imagePackagingBlocked)).toBe(true);
  await page.getByRole('button', { name: 'Cancel processing', exact: true }).click();
  await page.evaluate(() => (window as any).releaseImagePackaging());
  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Processing cancelled.');
  await expect(page.getByRole('button', { name: 'Download PNG', exact: true })).toHaveCount(0);
  await run.click();
  const result = await exported(page, 'Download PNG');
  expect((await sharp(result.bytes).metadata()).format).toBe('png');
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

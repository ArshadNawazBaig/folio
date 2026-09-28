import { test, expect } from './fixtures/editor-storage';
import { saveDownload, watchDownloads } from './fixtures/download';
import sharp from 'sharp';
import JSZip from 'jszip';
import jsQR from 'jsqr';
import { PDFDocument } from 'pdf-lib';

const png = await sharp({
  create: { width: 120, height: 80, channels: 4, background: '#45678980' },
})
  .png()
  .toBuffer();
const pdf = await PDFDocument.create();
for (let n = 1; n <= 2; n++)
  pdf.addPage([144, 72]).drawText(`Download page ${n}`, { x: 10, y: 30, size: 10 });
const input = {
  name: 'report.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from(await pdf.save()),
};

test.beforeEach(async ({ page }) => watchDownloads(page));

test('drawn and typed signatures save as transparent PNGs on a fresh tap', async ({ page }) => {
  await page.goto('/signature-generator');
  const canvas = page.getByLabel('Draw your signature', { exact: true });
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.3, { steps: 10 });
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6, { steps: 10 });
  await page.mouse.up();
  for (const mode of ['Draw', 'Type']) {
    if (mode === 'Type') {
      await page.getByRole('tab', { name: 'Type', exact: true }).click();
      await page.getByRole('textbox', { name: 'Your signature', exact: true }).fill('Alex Morgan');
    }
    const file = await saveDownload(page, 'Download PNG', 'image/png');
    expect(file.name).toBe('signature.png');
    const pixels = await sharp(file.bytes).ensureAlpha().raw().toBuffer();
    expect(pixels[3]).toBe(0);
    expect(pixels.some((value, index) => index % 4 === 3 && value === 255)).toBe(true);
  }
});

for (const format of ['JPG', 'PNG', 'WebP'])
  test(`compressed ${format} saves from both individual download buttons`, async ({ page }) => {
    await page.goto('/compress-images');
    await page.getByRole('combobox', { name: 'Output format', exact: true }).click();
    await page.getByRole('option', { name: format, exact: true }).click();
    await page
      .locator('input[type=file]')
      .first()
      .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png });
    await page.getByRole('button', { name: 'Compress images', exact: true }).click();
    for (const button of ['Download this image', 'Download image']) {
      const encoding = format === 'JPG' ? 'jpeg' : format.toLowerCase();
      const file = await saveDownload(page, button, `image/${encoding}`);
      expect((await sharp(file.bytes).metadata()).format).toBe(encoding);
      expect(file.bytes.length).toBeLessThanOrEqual(50000);
    }
  });

test('batch image ZIPs contain every file and the individual download stays usable', async ({
  page,
}) => {
  await page.goto('/compress-images');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles([
      { name: 'first.png', mimeType: 'image/png', buffer: png },
      { name: 'second.png', mimeType: 'image/png', buffer: png },
    ]);
  await page.getByRole('button', { name: 'Compress images', exact: true }).click();
  const file = await saveDownload(page, 'Download all (ZIP)', 'application/zip');
  const zip = await JSZip.loadAsync(file.bytes);
  expect(Object.keys(zip.files)).toHaveLength(2);
  for (const entry of Object.values(zip.files))
    expect((await sharp(await entry.async('nodebuffer')).metadata()).width).toBe(120);
  expect(
    (await sharp((await saveDownload(page, 'Download this image', 'image/png')).bytes).metadata())
      .width,
  ).toBe(120);
});

for (const [route, action, encoding] of [
  ['enhance-image', 'Apply adjustments', 'png'],
  ['jpg-to-webp', 'Convert to WEBP', 'webp'],
  ['webp-to-jpg', 'Convert to JPG', 'jpeg'],
])
  test(`${route} saves a readable processed image`, async ({ page }) => {
    const sourceFormat =
      route === 'jpg-to-webp' ? 'jpeg' : route === 'webp-to-jpg' ? 'webp' : 'png';
    await page.goto(`/${route}`);
    await page
      .locator('input[type=file]')
      .first()
      .setInputFiles({
        name: `photo.${sourceFormat}`,
        mimeType: `image/${sourceFormat}`,
        buffer: await sharp(png).toFormat(sourceFormat).toBuffer(),
      });
    await page.getByRole('button', { name: action, exact: true }).click();
    const file = await saveDownload(page, 'Download image', `image/${encoding}`);
    expect((await sharp(file.bytes).metadata()).format).toBe(encoding);
  });

test('QR PNG and SVG downloads are scannable', async ({ page }) => {
  await page.goto('/create-qr-code');
  await page
    .getByRole('textbox', { name: 'Website address', exact: true })
    .fill('https://example.com/mobile');
  await page.getByRole('button', { name: 'Generate QR code', exact: true }).click();
  for (const format of ['PNG', 'SVG']) {
    const file = await saveDownload(
      page,
      `Download ${format}`,
      format === 'PNG' ? 'image/png' : 'image/svg+xml',
    );
    const { data, info } = await sharp(file.bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(
      'https://example.com/mobile',
    );
  }
});

for (const format of ['JPG', 'PNG'])
  test(`PDF to ${format} saves a single image and a multi-page ZIP`, async ({ page }) => {
    await page.goto(`/pdf-to-${format.toLowerCase()}`);
    await page.locator('input[type=file]').first().setInputFiles(input);
    await page.getByLabel('Pages', { exact: true }).fill('1');
    await page.getByRole('button', { name: `Convert to ${format}`, exact: true }).click();
    const encoding = format === 'JPG' ? 'jpeg' : 'png';
    const image = await saveDownload(page, `Download ${format}`, `image/${encoding}`);
    expect((await sharp(image.bytes).metadata()).format).toBe(encoding);
    await page.getByLabel('Pages', { exact: true }).fill('1-2');
    await page.getByRole('button', { name: `Convert to ${format}`, exact: true }).click();
    const zip = await JSZip.loadAsync(
      (await saveDownload(page, 'Download ZIP', 'application/zip')).bytes,
    );
    expect(Object.keys(zip.files)).toHaveLength(2);
  });

test('extracted text and merged image PDF downloads contain the source content', async ({
  page,
}) => {
  await page.goto('/pdf-to-text');
  await page.locator('input[type=file]').first().setInputFiles(input);
  await page.getByRole('button', { name: 'Extract text', exact: true }).click();
  const text = await saveDownload(page, 'Download text', 'text/plain;charset=utf-8');
  expect(text.bytes.toString()).toContain('Download page 1');
  await page.goto('/merge-images');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  const file = await saveDownload(page, 'Download PDF', 'application/pdf');
  expect((await PDFDocument.load(file.bytes)).getPageCount()).toBe(1);
});

test('the text editor can download the current copy before processing', async ({ page }) => {
  await page.goto('/edit-pdf-text');
  await page.locator('input[type=file]').first().setInputFiles(input);
  const file = await saveDownload(page, 'Download current copy', 'application/pdf');
  expect(file.bytes).toEqual(input.buffer);
});

test('the text editor exports edited sample text through the mobile save dialog', async ({
  page,
}) => {
  await page.goto('/edit-pdf-text?demo=1');
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await page.getByRole('textbox', { name: 'Replacement text' }).fill('A space to');
  const file = await saveDownload(page, 'Download PDF', 'application/pdf');
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(file.bytes), useSystemFonts: true });
  try {
    const content = await (await (await task.promise).getPage(1)).getTextContent();
    expect(content.items.map((item) => ('str' in item ? item.str : '')).join(' ')).toContain(
      'A space to',
    );
  } finally {
    await task.destroy();
  }
});

test('small screens keep the download reachable when native sharing is unsupported', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: () => Promise.resolve(),
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: () => {
        throw new Error('File sharing unavailable');
      },
    });
  });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/signature-generator');
  await page.getByRole('tab', { name: 'Type', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your signature', exact: true }).fill('Alex Morgan');
  await page.getByRole('button', { name: 'Download PNG', exact: true }).click();
  const ready = page.getByRole('dialog', { name: 'Your file is ready.' });
  await expect(ready).toBeVisible();
  await expect(ready.getByRole('button', { name: 'Share file' })).toHaveCount(0);
  await page.setViewportSize({ width: 568, height: 320 });
  await expect(ready.getByRole('link', { name: 'Download file', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const pending = page.waitForEvent('download');
  await ready.getByRole('link', { name: 'Download file', exact: true }).click();
  expect((await pending).suggestedFilename()).toBe('signature.png');
});

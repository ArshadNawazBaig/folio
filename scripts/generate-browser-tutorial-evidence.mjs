import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

// Run against a local production build. Every artifact is downloaded through
// the actual controls; the script does not open customer accounts or workspaces.
const origin = process.env.TUTORIAL_AUDIT_URL || 'http://127.0.0.1:3012';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
  throw new Error('Use a local production server for these fictional exercises.');
const directory = new URL('../public/samples/tutorials/', import.meta.url);
await mkdir(directory, { recursive: true });
const evidence = JSON.parse(
  await readFile(new URL('../src/lib/tutorial-evidence.json', import.meta.url), 'utf8'),
);
const browser = await chromium.launch({ channel: 'chromium' });
const context = await browser.newContext({
  baseURL: origin,
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
async function upload(path) {
  const chooser = page.waitForEvent('filechooser');
  await page.locator('.upload-area button').click();
  await (await chooser).setFiles(path);
}
async function choose(label, value) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: value, exact: true }).click();
}
async function result(button, name, checks) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: button, exact: true }).click();
  const download = await pending;
  assert.equal(await download.failure(), null);
  const bytes = await readFile(await download.path());
  const metadata = await sharp(bytes).metadata();
  await writeFile(new URL(name, directory), bytes);
  evidence.files[name] = {
    href: `/samples/tutorials/${name}`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    checks,
    width: metadata.width,
    height: metadata.height,
    bytes: bytes.length,
    format: metadata.format,
  };
  console.log(`${name}: ${metadata.width} × ${metadata.height}, ${bytes.length} bytes`);
  await writeFile(
    new URL('../src/lib/tutorial-evidence.json', import.meta.url),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  return { bytes, metadata };
}
try {
  await page.goto('/signature-generator');
  await page.getByRole('tab', { name: 'Type', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your signature', exact: true }).fill('Sam Example');
  await page.getByRole('button', { name: 'Classic', exact: true }).click();
  const signature = await result('Download PNG', 'fictional-signature.png', [
    'Typed Sam Example, Classic, black ink',
    'Transparent background, fictional signature only',
  ]);
  const pixels = await sharp(signature.bytes).ensureAlpha().raw().toBuffer();
  assert.equal(pixels[3], 0);
  assert.ok(pixels.some((v, i) => i % 4 === 3 && v === 255));

  await page.goto('/jpg-to-webp');
  await upload('public/samples/practice-receipt.jpg');
  await choose('Image dimensions', 'Keep original dimensions');
  await page.getByRole('button', { name: 'Convert to WEBP', exact: true }).click();
  const webp = await result('Download image', 'receipt-converted.webp', [
    'Original dimensions; default quality 85%',
    'Actual WebP output',
  ]);
  assert.equal(webp.metadata.format, 'webp');
  assert.deepEqual([webp.metadata.width, webp.metadata.height], [1200, 900]);

  await page.goto('/webp-to-jpg');
  await upload('public/samples/practice-transparent.webp');
  await page.getByRole('button', { name: 'Convert to JPG', exact: true }).click();
  const jpg = await result('Download image', 'transparent-source-on-white.jpg', [
    'Original dimensions; default quality 85%',
    'Transparent corners become white',
  ]);
  const corner = await sharp(jpg.bytes).raw().toBuffer();
  assert.deepEqual([...corner.subarray(0, 3)], [255, 255, 255]);

  await page.goto('/compress-images');
  await page.getByRole('button', { name: '20 KB', exact: true }).click();
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles('public/samples/practice-receipt.jpg');
  await choose('Output format', 'JPG');
  await page.getByRole('button', { name: 'Compress images', exact: true }).click();
  const compressed = await result('Download image', 'receipt-under-20kb.jpg', [
    '20 KB target, JPG output',
    'Actual returned size checked at or below 20,000 bytes',
  ]);
  assert.ok(compressed.bytes.length <= 20000);

  await page.goto('/enhance-image');
  await upload('public/samples/practice-receipt.jpg');
  await page.getByRole('slider', { name: 'Brightness', exact: true }).fill('10');
  await page.getByRole('button', { name: 'Apply adjustments', exact: true }).click();
  await result('Download image', 'receipt-brightness-10.jpg', [
    'Brightness +10; other adjustments unchanged',
    'Keep original dimensions; JPG output',
  ]);

  for (const [slug, resolution, action, filename, width, height] of [
    ['pdf-to-jpg', 'High — 144 DPI', 'Convert to JPG', 'landscape-144dpi.jpg', 1584, 1224],
    ['pdf-to-png', 'Print — 300 DPI', 'Convert to PNG', 'landscape-300dpi.png', 3300, 2550],
  ]) {
    await page.goto(`/${slug}`);
    await upload('public/samples/letter-landscape-practice.pdf');
    await choose('Resolution', resolution);
    await page.getByRole('button', { name: action, exact: true }).click();
    const image = await result(slug === 'pdf-to-jpg' ? 'Download JPG' : 'Download PNG', filename, [
      resolution,
      `${width} × ${height} pixels from the 11 × 8.5 inch source`,
    ]);
    assert.deepEqual([image.metadata.width, image.metadata.height], [width, height]);
  }
  await page.goto('/merge-images');
  await upload([
    'public/samples/practice-receipt.jpg',
    'public/samples/practice-screenshot.png',
    'public/samples/practice-transparent.webp',
  ]);
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const merged = await pending;
  const mergedBytes = await readFile(await merged.path());
  const pdf = await PDFDocument.load(mergedBytes);
  assert.equal(pdf.getPageCount(), 3);
  assert.ok(pdf.getPages().every((p) => p.getWidth() === 595.28 && p.getHeight() === 841.89));
  await writeFile(new URL('three-image-packet.pdf', directory), mergedBytes);
  evidence.files['three-image-packet.pdf'] = {
    href: '/samples/tutorials/three-image-packet.pdf',
    sha256: createHash('sha256').update(mergedBytes).digest('hex'),
    checks: ['Receipt, screenshot, transparent WebP in order', 'Three A4 portrait pages; no OCR'],
  };
  evidence.browserCheckedAt = new Date().toISOString();
  evidence.browserMethod =
    'Chromium production UI downloads; Sharp format/dimension/alpha inspection. Measurements apply only to these fictional files and settings.';
  await writeFile(
    new URL('../src/lib/tutorial-evidence.json', import.meta.url),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
} finally {
  await context.close();
  await browser.close();
}

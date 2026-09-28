import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';
import JSZip from 'jszip';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

// Detailed pixels force real quality/dimension changes, not an already-small flat fixture.
const pixels = Buffer.alloc(800 * 600 * 4);
let seed = 921;
for (let i = 0; i < pixels.length; i += 4) {
  for (let channel = 0; channel < 3; channel++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    pixels[i + channel] = seed >>> 24;
  }
  pixels[i + 3] = (i / 4) % 800 < 60 ? 0 : 255;
}
const source = await sharp(pixels, { raw: { width: 800, height: 600, channels: 4 } })
  .png()
  .toBuffer();
async function add(page: Page, name = 'private-photo.png', buffer = source) {
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name, mimeType: 'image/png', buffer });
}
async function choose(page: Page, format: string) {
  await page.getByRole('combobox', { name: 'Output format', exact: true }).click();
  await page.getByRole('option', { name: format, exact: true }).click();
}
async function compress(page: Page) {
  await page.getByRole('button', { name: 'Compress images', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download image', exact: true })).toBeVisible();
}
async function download(page: Page, name = 'Download image') {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  const file = await event;
  return { bytes: await readFile((await file.path())!), name: file.suggestedFilename() };
}

for (const format of ['JPG', 'PNG', 'WebP'])
  test(`${format} output meets a 20 KB limit and uses the requested encoding`, async ({ page }) => {
    await page.goto('/compress-images');
    await page.getByRole('button', { name: '20 KB', exact: true }).click();
    await choose(page, format);
    await add(page);
    await compress(page);
    const file = await download(page);
    expect(file.bytes.length).toBeLessThanOrEqual(20000);
    const info = await sharp(file.bytes).metadata();
    expect(info.format).toBe(format === 'JPG' ? 'jpeg' : format.toLowerCase());
    expect(info.width).toBeLessThanOrEqual(800);
    expect(Math.abs(info.width! / info.height! - 4 / 3)).toBeLessThan(0.03);
    if (format === 'JPG') {
      const pixel = await sharp(file.bytes).removeAlpha().raw().toBuffer();
      expect([...pixel.subarray(0, 3)]).toEqual([255, 255, 255]);
    } else {
      const pixel = await sharp(file.bytes).ensureAlpha().raw().toBuffer();
      expect(pixel[3]).toBe(0);
    }
  });

test('all presets and custom KB limits apply before upload; changed settings invalidate old downloads', async ({
  page,
}) => {
  await page.goto('/compress-images');
  for (const label of [
    '10 KB',
    '15 KB',
    '20 KB',
    '30 KB',
    '40 KB',
    '50 KB',
    '100 KB',
    '200 KB',
    '500 KB',
    '1 MB',
  ])
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  const custom = page.getByRole('textbox', { name: 'Custom size (KB)' });
  await custom.fill('0');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('1 to 35,000');
  await custom.fill('75');
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByText(/Current limit: 75.0 KB/)).toBeVisible();
  await add(page);
  await compress(page);
  const file = await download(page);
  expect(file.bytes.length).toBeLessThanOrEqual(75000);
  expect((await sharp(file.bytes).ensureAlpha().raw().toBuffer())[3]).toBe(0);
  await page.screenshot({ path: '/tmp/folio-image-compressor-result.png', fullPage: true });
  await page.getByRole('button', { name: '10 KB', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download image', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Manual settings', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Image dimensions', exact: true })).toBeVisible();
  await compress(page);
  expect((await sharp((await download(page)).bytes).metadata()).width).toBe(800);
});

test('batch compression retains successful files when one input is corrupt and preserves duplicate names in ZIP', async ({
  page,
}) => {
  await page.goto('/compress-images');
  await page.getByRole('button', { name: '10 KB', exact: true }).click();
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles([
      { name: 'same.png', mimeType: 'image/png', buffer: source },
      { name: 'same.png', mimeType: 'image/png', buffer: source },
      { name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken image') },
    ]);
  await page.getByRole('button', { name: 'Compress images', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('1 image(s)');
  const zip = await JSZip.loadAsync((await download(page, 'Download all (ZIP)')).bytes);
  expect(Object.keys(zip.files)).toHaveLength(2);
  for (const entry of Object.values(zip.files)) {
    const bytes = await entry.async('nodebuffer');
    expect(bytes.length).toBeLessThanOrEqual(10000);
    expect((await sharp(bytes).metadata()).width).toBeGreaterThan(0);
  }
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose files', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download all (ZIP)', exact: true })).toHaveCount(
    0,
  );
});

test('images stay out of network requests and persistent storage; clearing and refresh discard them', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const writes: string[] = [];
    Object.assign(window, { compressionStorageWrites: writes });
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      writes.push(`${key}:${value}`);
      return original.call(this, key, value);
    };
    for (const method of ['put', 'add'] as const) {
      const original = IDBObjectStore.prototype[method];
      IDBObjectStore.prototype[method] = function (...args: Parameters<typeof original>) {
        writes.push(
          args
            .map((item) => (item instanceof Blob ? 'IMAGE_BLOB_WRITE' : JSON.stringify(item)))
            .join(' '),
        );
        return original.apply(this, args);
      };
    }
  });
  const requests: string[] = [];
  page.on('request', (request) =>
    requests.push(`${request.method()} ${request.url()} ${request.postData() || ''}`),
  );
  await page.goto('/compress-images');
  await add(page, 'CompressionCanary928.png');
  await compress(page);
  await download(page);
  const writes = await page.evaluate(
    () => (window as unknown as { compressionStorageWrites: string[] }).compressionStorageWrites,
  );
  expect(writes.join(' ')).not.toMatch(/CompressionCanary928|IMAGE_BLOB_WRITE|data:image/);
  expect(requests.join(' ')).not.toMatch(
    /CompressionCanary928|data:image|POST [^\s]*(?:\/api\/(?:workspaces|account\/files)|\/storage\/v1)/,
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Choose files', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download image', exact: true })).toHaveCount(0);
});

test('input limits and unreadable images produce useful errors without offering empty downloads', async ({
  page,
}) => {
  await page.goto('/compress-images');
  const input = page.locator('input[type=file]').first();
  await input.setInputFiles({
    name: 'too-large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(35_000_001),
  });
  await expect(page.getByRole('main').getByRole('alert')).toContainText('up to 35 MB');
  await input.setInputFiles(
    Array.from({ length: 21 }, (_, i) => ({
      name: `${i}.png`,
      mimeType: 'image/png',
      buffer: Buffer.from('small fixture'),
    })),
  );
  await expect(page.getByRole('main').getByRole('alert')).toContainText('up to 20 images');
  await add(page, 'unreadable.png', Buffer.from('broken image'));
  await page.getByRole('button', { name: 'Compress images', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('1 image(s)');
  await expect(page.getByText('0 images are ready.', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download image', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download all (ZIP)', exact: true })).toHaveCount(
    0,
  );
});

test('clearing an active batch cancels its workers and allows a fresh result', async ({ page }) => {
  await page.goto('/compress-images');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(
      Array.from({ length: 20 }, (_, i) => ({
        name: `batch-${i}.png`,
        mimeType: 'image/png',
        buffer: source,
      })),
    );
  await page.getByRole('button', { name: 'Compress images', exact: true }).click();
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose files', exact: true })).toBeVisible();
  await add(page, 'new-batch.png');
  await compress(page);
  const result = await download(page);
  expect(result.name).toContain('new-batch');
  expect(result.bytes.length).toBeLessThanOrEqual(100000);
  await expect(page.getByRole('button', { name: 'Download all (ZIP)', exact: true })).toHaveCount(
    0,
  );
});

test('compression settings are accessible on mobile and the site navigation fits at desktop widths', async ({
  page,
}) => {
  await page.goto('/compress-images');
  for (const width of [1440, 1280, 1152, 1050, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      await page.getByRole('button', { name: 'Apply', exact: true }).evaluate((button) => {
        const range = document.createRange();
        range.selectNodeContents(button);
        return range.getClientRects().length;
      }),
    ).toBe(1);
  }
  const violations = (
    await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  ).violations;
  expect(violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
  await page.screenshot({ path: '/tmp/folio-image-compressor-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: '/tmp/folio-image-compressor-desktop.png', fullPage: true });
});

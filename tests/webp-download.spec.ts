import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { saveDownload, watchDownloads } from './fixtures/download';

test('detailed WebP compression meets the target, preserves alpha and stays on the device', async ({
  page,
  browserName,
}) => {
  const pixels = Buffer.alloc(800 * 600 * 4);
  let seed = 921;
  for (let i = 0; i < pixels.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      pixels[i + channel] = seed >>> 24;
    }
    pixels[i + 3] = (i / 4) % 800 < 60 ? 0 : 255;
  }
  const buffer = await sharp(pixels, { raw: { width: 800, height: 600, channels: 4 } })
    .png()
    .toBuffer();
  const requests: { url: string; method: string; body: string | null }[] = [];
  page.on('request', (request) =>
    requests.push({ url: request.url(), method: request.method(), body: request.postData() }),
  );
  await watchDownloads(page);
  await page.goto('/compress-images');
  await page.getByRole('button', { name: '20 KB', exact: true }).click();
  await page.getByRole('combobox', { name: 'Output format', exact: true }).click();
  await page.getByRole('option', { name: 'WebP', exact: true }).click();
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({ name: 'MobilePrivatePhoto.png', mimeType: 'image/png', buffer });
  await page.getByRole('button', { name: 'Compress images', exact: true }).click();
  const file = await saveDownload(page, 'Download image', 'image/webp');
  expect(file.bytes.length).toBeLessThanOrEqual(20000);
  const info = await sharp(file.bytes).metadata();
  expect(info.format).toBe('webp');
  expect(info.width).toBeLessThan(800);
  expect(Math.abs(info.width! / info.height! - 4 / 3)).toBeLessThan(0.03);
  expect((await sharp(file.bytes).ensureAlpha().raw().toBuffer())[3]).toBe(0);
  expect(JSON.stringify(requests)).not.toMatch(/MobilePrivatePhoto|data:image/);
  expect(
    requests.filter(
      (request) =>
        request.method !== 'GET' &&
        /\/api\/(?:workspaces|account\/files)|\/storage\/v1\//.test(request.url),
    ),
  ).toEqual([]);
  const wasm = requests.filter(
    (request) => request.url.includes('/codecs/webp/') && request.url.endsWith('.wasm'),
  );
  if (browserName === 'webkit') expect(wasm).toHaveLength(1);
  else expect(wasm).toHaveLength(0);
  for (const request of wasm) {
    expect(request.method).toBe('GET');
    expect(new URL(request.url).origin).toBe(new URL(page.url()).origin);
    expect(request.body).toBeNull();
  }
});

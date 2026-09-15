import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { init } from '@embedpdf/pdfium';
import { PNG } from 'pngjs';
import { createSample } from '../src/lib/sample';
import { processTextPdf } from '../scripts/pdf-text-engine.mjs';
import { processTextPdf as render } from '../src/lib/pdf-text-engine.mjs';
import { previewMemory, trimPreviews } from '../src/lib/text-preview-cache';
import type { PixelTextPreview, TextInspection, TextPreview } from '../src/lib/pro-types';
import { defaultTextChange } from '../src/lib/editor-text';

test('transferred previews preserve the exact server PNG pixels without image encoding', async () => {
  const api = await init({
    wasmBinary: await readFile(new URL(import.meta.resolve('@embedpdf/pdfium/pdfium.wasm'))),
  });
  api.PDFiumExt_Init();
  const source = await createSample();
  const inspection = (await processTextPdf(source, {
    operation: 'inspect',
    page: 0,
  })) as TextInspection;
  const job = {
    operation: 'preview',
    page: 0,
    pixelWidth: 400,
    changes: [{ ...defaultTextChange(inspection.blocks[0]), text: '' }],
  };
  const pixel = (await render(source, job, {
    allowExport: false,
    transferPixels: true,
    engine: () => api,
    encodeRgba: () => {
      throw new Error('Pixel previews must not encode PNG.');
    },
  })) as PixelTextPreview;
  const png = (await processTextPdf(source, job)) as TextPreview;
  const decoded = PNG.sync.read(Buffer.from(png.preview, 'base64'));
  assert.equal(pixel.width, decoded.width);
  assert.equal(pixel.height, decoded.height);
  assert.deepEqual(Buffer.from(pixel.pixels[0].data), decoded.data);
});

test('preview caches bound raw and decoded image memory and release oversized pages', () => {
  const images = new Map<string, PixelTextPreview>();
  for (let i = 0; i < 6; i++) {
    images.set(String(i), {
      page: i,
      width: 1024,
      height: 3072,
      pixels: [{ top: 0, height: 3072, data: new Uint8Array(12 * 1024 * 1024) }],
    });
    trimPreviews(images, (value) => value);
  }
  assert.deepEqual([...images.keys()], ['2', '3', '4', '5']);
  assert.equal(
    [...images.values()].reduce((total, image) => total + previewMemory(image), 0),
    48 * 1024 * 1024,
  );
  const encoded = { page: 0, width: 4096, height: 4096, preview: 'small compressed image' };
  const large = new Map([['large', encoded]]);
  trimPreviews(large, (value) => value);
  assert.equal(large.size, 0);
});

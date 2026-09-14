import test from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { processTextPdf } from '../scripts/pdf-text-engine.mjs';
import {
  pdfPreviewLayout,
  MAX_PREVIEW_PIXELS,
  PREVIEW_TILE_PIXELS,
} from '../src/lib/pdf-preview.mjs';
import { createLongTextPdf } from './fixtures/long-text-pdf';
import { defaultTextChange } from '../src/lib/editor-text';
import type { TextInspection, TextPreview } from '../src/lib/pro-types';

test('long edited pages retain display resolution and preserve content across image sections', async () => {
  const source = await createLongTextPdf();
  const inspection = (await processTextPdf(source, { operation: 'inspect' })) as TextInspection;
  const title = inspection.blocks.find((block) => block.text === 'Long receipt')!;
  const before = (await processTextPdf(source, {
    operation: 'preview',
    page: 0,
    changes: [],
    pixelWidth: 1200,
  })) as TextPreview;
  const after = (await processTextPdf(source, {
    operation: 'preview',
    page: 0,
    pixelWidth: 1200,
    changes: [{ ...defaultTextChange(title), text: 'Updated receipt' }],
  })) as TextPreview;
  assert.equal(after.width, 1200);
  assert.equal(after.height, 9600);
  assert.equal('bytes' in after, false);
  assert.ok(after.tiles && after.tiles.length > 1);
  let height = 0;
  for (const [index, tile] of after.tiles.entries()) {
    assert.equal(tile.top, height);
    const pixels = PNG.sync.read(Buffer.from(tile.preview, 'base64'));
    assert.equal(pixels.width, 1200);
    assert.equal(pixels.height, tile.height);
    assert.ok(pixels.width * pixels.height <= PREVIEW_TILE_PIXELS);
    height += tile.height;
    if (index)
      assert.equal(
        tile.preview,
        before.tiles![index].preview,
        'Editing the title must not affect lower sections',
      );
    else assert.notEqual(tile.preview, before.tiles![index].preview);
    // The green band crosses the first tile seam at y=3495.
    for (const y of [3440, 3480, 3520, 3550]) {
      if (y < tile.top || y >= tile.top + tile.height) continue;
      const at: number = ((y - tile.top) * pixels.width + 600) * 4;
      assert.deepEqual([...pixels.data.subarray(at, at + 4)], [0, 128, 0, 255]);
    }
  }
  assert.equal(height, after.height);
  const rotated = (await processTextPdf(source, {
    operation: 'preview',
    page: 0,
    pixelWidth: 1200,
    rotation: 90,
    changes: [],
  })) as TextPreview;
  assert.equal(rotated.width, 1200);
  assert.equal(rotated.height, 150);
});

test('preview sizing rejects invalid resolutions and bounds extreme page allocations', () => {
  for (const width of [0, -1, 4097, 1200.5, NaN, Infinity])
    assert.throws(() => pdfPreviewLayout(300, 2400, width), /resolution/);
  for (const dimensions of [
    [0, 100],
    [100, NaN],
    [Infinity, 100],
  ])
    assert.throws(() => pdfPreviewLayout(dimensions[0], dimensions[1], 1200), /dimensions/);
  for (const dimensions of [
    [1, 100000],
    [100000, 1],
    [100000, 100000],
  ]) {
    const result = pdfPreviewLayout(dimensions[0], dimensions[1], 4096);
    assert.ok(result.width <= 4096);
    assert.ok(result.height <= 65536);
    assert.ok(result.width * result.height <= MAX_PREVIEW_PIXELS);
    for (const tile of result.tiles) assert.ok(result.width * tile.height <= PREVIEW_TILE_PIXELS);
  }
});

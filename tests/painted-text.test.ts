import test from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { readFile } from 'node:fs/promises';
import { paintedTextPdf } from './fixtures/painted-text';
import { processTextPdf } from '../scripts/pdf-text-engine.mjs';
import { defaultTextChange } from '../src/lib/editor-text';
import type { TextInspection, TextPreview } from '../src/lib/pro-types';

function compose(preview: TextPreview, base?: Buffer) {
  const result = base ? Buffer.from(base) : Buffer.alloc(preview.width * preview.height * 4);
  for (const tile of preview.tiles || [
    { top: 0, height: preview.height, preview: preview.preview },
  ]) {
    const pixels = PNG.sync.read(Buffer.from(tile.preview, 'base64'));
    pixels.data.copy(result, tile.top * preview.width * 4);
  }
  return result;
}

test('gradient letters and missing-glyph fallback runs each remain editable after export', async () => {
  const source = await paintedTextPdf(
    true,
    await readFile(new URL('../public/fonts/pdf/LiberationSans-Bold.ttf', import.meta.url)),
  );
  const inspection = (await processTextPdf(source, {
    operation: 'inspect',
    page: 0,
  })) as TextInspection;
  const block = inspection.blocks.find((b) => b.text === 'scale')!;
  const edited = (await processTextPdf(source, {
    operation: 'edit',
    changes: [{ ...defaultTextChange(block), text: 'scale 492' }],
  })) as Uint8Array;
  const reopened = (await processTextPdf(edited, {
    operation: 'inspect',
    page: 0,
  })) as TextInspection;
  const digits = reopened.blocks.find((b) => b.text.includes('492'));
  assert.ok(digits?.paint);
  assert.ok(reopened.blocks.some((b) => b.text.includes('scale') && b.paint));
  const twice = (await processTextPdf(edited, {
    operation: 'edit',
    changes: [{ ...defaultTextChange(digits), text: '493' }],
  })) as Uint8Array;
  const final = (await processTextPdf(twice, { operation: 'inspect', page: 0 })) as TextInspection;
  assert.ok(final.blocks.some((b) => b.text.includes('493') && b.paint));
  assert.ok(final.blocks.some((b) => b.text.includes('scale') && b.paint));
});

test('partial previews match full rendering when moving text across a colored page and rotating it', async () => {
  const source = await paintedTextPdf();
  const inspection = (await processTextPdf(source, {
    operation: 'inspect',
    page: 0,
  })) as TextInspection;
  const block = inspection.blocks.find((b) => b.text === 'scale')!;
  for (const rotation of [0, 90, 180, 270]) {
    const job = { operation: 'preview', page: 0, pixelWidth: 500, rotation };
    const original = (await processTextPdf(source, { ...job, changes: [] })) as TextPreview;
    const changes = [
      { ...defaultTextChange(block), text: 'scale further', offset: { x: 50, y: -500 } },
    ];
    const full = (await processTextPdf(source, { ...job, changes })) as TextPreview;
    const partial = (await processTextPdf(source, {
      ...job,
      changes,
      partial: true,
    })) as TextPreview;
    assert.deepEqual(
      compose(partial, compose(original)),
      compose(full),
      `Rotation ${rotation} preserves both the old location and new ink`,
    );
  }
});

for (const gradient of [false, true])
  test(`painted ${gradient ? 'gradient' : 'purple'} text retains its appearance and stays editable after export`, async () => {
    const source = await paintedTextPdf(gradient);
    const inspection = (await processTextPdf(source, {
      operation: 'inspect',
      page: 0,
    })) as TextInspection;
    const block = inspection.blocks.find((b) => b.text === 'scale')!;
    assert.ok(block?.paint);
    assert.notEqual(block.color, '#000000');
    assert.equal(
      inspection.blocks.some((b) => b.text === 'Hidden OCR'),
      false,
    );
    const change = { ...defaultTextChange(block), text: 'scale faster' };
    const output = (await processTextPdf(source, {
      operation: 'edit',
      changes: [change],
    })) as Uint8Array;
    const reopened = (await processTextPdf(output, {
      operation: 'inspect',
      page: 0,
    })) as TextInspection;
    const edited = reopened.blocks.find((b) => b.text === 'scale faster');
    assert.ok(edited);
    assert.equal(edited.font, block.font);
    assert.notEqual(edited.color, '#000000');
    if (gradient) assert.ok(edited.paint);
    const rendered = (await processTextPdf(output, {
      operation: 'preview',
      page: 0,
      pixelWidth: 500,
      changes: [],
    })) as TextPreview;
    const appearance = PNG.sync.read(Buffer.from(rendered.tiles![0].preview, 'base64'));
    const ink = new Set<number>();
    // Only inspect the edited word, excluding the ordinary purple heading.
    for (let y = 195; y < 260; y++)
      for (let x = 35; x < 350; x++) {
        const index = (y * appearance.width + x) * 4;
        if (appearance.data[index + 1] === 58 && appearance.data[index + 2] === 237)
          ink.add(appearance.data[index]);
      }
    assert.ok(ink.has(gradient ? 164 : 124), 'Exported text has visible purple ink');
    if (gradient) assert.ok(ink.size > 10, 'The exported gradient retains multiple color stops');
    const twice = (await processTextPdf(output, {
      operation: 'edit',
      changes: [{ ...defaultTextChange(edited), text: 'scale again' }],
    })) as Uint8Array;
    const reedited = (await processTextPdf(twice, {
      operation: 'inspect',
      page: 0,
    })) as TextInspection;
    assert.ok(reedited.blocks.some((b) => b.text === 'scale again'));
    const selected = (await processTextPdf(source, {
      operation: 'preview',
      page: 0,
      partial: true,
      pixelWidth: 1000,
      changes: [{ ...change, text: '' }],
    })) as TextPreview;
    assert.ok(selected.partial);
    assert.ok(selected.tiles!.reduce((h, t) => h + t.height, 0) < 200);
    const pixels = PNG.sync.read(Buffer.from(selected.tiles![0].preview, 'base64')).data;
    assert.equal(
      Array.from({ length: pixels.length / 4 }, (_, i) => i * 4).some(
        (i) => pixels[i] > 80 && pixels[i + 2] > 150 && pixels[i + 1] < 100,
      ),
      false,
      'No old purple ink remains in the selected strip',
    );
  });

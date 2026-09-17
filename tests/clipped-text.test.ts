import test from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { clippedTextPdf } from './fixtures/clipped-text';
import { processTextPdf } from '../scripts/pdf-text-engine.mjs';
import { defaultTextChange } from '../src/lib/editor-text';
import type { TextInspection, TextPreview } from '../src/lib/pro-types';

test('rounded cards, nested clips and other sections expose visible text without hidden overflow', async () => {
  const bytes = await clippedTextPdf();
  const inspection = (await processTextPdf(bytes, {
    operation: 'inspect',
    page: 0,
  })) as TextInspection;
  assert.equal(inspection.version, 4);
  assert.deepEqual(
    inspection.blocks.map((b) => b.text),
    [
      'Visible document heading',
      'Card title',
      'Visible card description',
      'Second visible line',
      'Another section',
      'Visible account details',
    ],
  );
  const card = inspection.blocks.find((b) => b.text === 'Card title')!;
  const description = inspection.blocks.find((b) => b.text === 'Visible card description')!;
  const next = {
    ...defaultTextChange(card),
    text: 'Moved purple title',
    offset: { x: 0, y: -500 },
  };
  const changes = [
    next,
    { ...defaultTextChange(description), text: 'Updated description', font: 'Courier-Bold' },
  ];
  const exported = (await processTextPdf(bytes, { operation: 'edit', changes })) as Uint8Array;
  const reopened = (await processTextPdf(exported, {
    operation: 'inspect',
    page: 0,
  })) as TextInspection;
  const title = reopened.blocks.find((b) => b.text === next.text)!;
  assert.ok(title);
  assert.equal(title.font, card.font);
  assert.equal(title.color, card.color);
  assert.ok(Math.abs(title.matrix![5] - card.matrix![5] + 500) < 0.01);
  const rendered = (await processTextPdf(exported, {
    operation: 'preview',
    page: 0,
    pixelWidth: 600,
    changes: [],
  })) as TextPreview;
  const pixels = PNG.sync.read(Buffer.from(rendered.preview, 'base64'));
  const purpleIn = (top: number, bottom: number) => {
    let count = 0;
    for (let y = top; y < bottom; y++)
      for (let x = 40; x < 350; x++) {
        const i = (y * pixels.width + x) * 4;
        if (pixels.data[i] === 124 && pixels.data[i + 1] === 58 && pixels.data[i + 2] === 237)
          count++;
      }
    return count;
  };
  assert.ok(purpleIn(650, 690) > 50, 'Moved text renders outside the old clipping region');
  assert.equal(purpleIn(150, 190), 0, 'The original title ink is removed');
  assert.ok(
    reopened.blocks.some((b) => b.text === 'Updated description' && b.font === 'Courier-Bold'),
  );
  assert.ok(
    !reopened.blocks.some(
      (b) =>
        b.text === card.text || b.text === description.text || b.text.includes('Hidden overflow'),
    ),
  );
  const selected = (await processTextPdf(bytes, {
    operation: 'preview',
    page: 0,
    partial: true,
    pixelWidth: 600,
    changes: [{ ...next, text: '' }],
  })) as TextPreview;
  assert.ok(selected.partial && selected.tiles?.length);
  // Re-edit the exported, moved text using the exact original font.
  const twice = (await processTextPdf(exported, {
    operation: 'edit',
    changes: [{ ...defaultTextChange(title), text: 'Edited again' }],
  })) as Uint8Array;
  const final = (await processTextPdf(twice, { operation: 'inspect', page: 0 })) as TextInspection;
  assert.ok(final.blocks.some((b) => b.text === 'Edited again' && b.color === card.color));
});

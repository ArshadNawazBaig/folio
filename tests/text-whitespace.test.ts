import test from 'node:test';
import assert from 'node:assert/strict';
import { adjacentTextPdf } from './fixtures/adjacent-text-pdf';
import { processTextPdf } from '../scripts/pdf-text-engine.mjs';
import { defaultTextChange } from '../src/lib/editor-text';
import type { TextInspection, TextPreview } from '../src/lib/pro-types';

test('boundary spaces in a saved edit do not block selecting adjacent text or other sections', async () => {
  const bytes = await adjacentTextPdf();
  const before = (await processTextPdf(bytes, { operation: 'inspect' })) as TextInspection;
  const [label, value, section] = before.blocks;
  assert.equal(label.text, 'PROFILE NAME ');
  for (const font of ['original', 'Courier-Bold']) {
    for (const text of ['UPDATED PROFILE ', '  UPDATED PROFILE  ']) {
      const change = { ...defaultTextChange(label), font, text };
      for (const selected of [label, value, section]) {
        const changes = [
          ...(selected.id === label.id ? [] : [change]),
          { ...defaultTextChange(selected), text: '' },
        ];
        const preview = (await processTextPdf(bytes, {
          operation: 'preview',
          page: 0,
          partial: true,
          pixelWidth: 600,
          changes,
        })) as TextPreview;
        assert.ok(preview.tiles?.length, `${font}: selecting ${selected.id} prepares clean ink`);
      }
      const output = (await processTextPdf(bytes, {
        operation: 'edit',
        changes: [change, { ...defaultTextChange(value), text: '' }],
      })) as Uint8Array;
      const after = (await processTextPdf(output, { operation: 'inspect' })) as TextInspection;
      assert.equal(after.blocks[0].text.trim(), text.trim());
      assert.equal(after.blocks[0].color, label.color);
      assert.equal(after.blocks[0].font, font === 'original' ? label.font : font);
      assert.equal(after.blocks[1].text, section.text);
      assert.equal(after.blocks.length, 2);
    }
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { processTextPdf } from '../scripts/pdf-text-engine.mjs';
import { createEmbeddedFontPdf } from './fixtures/embedded-font-pdf';
import { createScaledTextPdf } from './fixtures/scaled-text-pdf';
import { paintedTextPdf } from './fixtures/painted-text';
import { clippedTextPdf } from './fixtures/clipped-text';
import { arrangedTextChanges, defaultTextChange } from '../src/lib/editor-text';
import { exportEditor } from '../src/lib/pdf-engine';
import { workspaceSchema } from '../src/lib/workspace-types';
import type { TextBlock, TextChange, TextInspection } from '../src/lib/pro-types';
import type { EditorState } from '../src/lib/types';
const inspect = async (bytes: Uint8Array) =>
  (await processTextPdf(bytes, { operation: 'inspect' })) as TextInspection;
const copy = (block: TextBlock, target = block.page): TextChange => ({
  ...defaultTextChange(block),
  id: `${target}:${block.objectIndex}:${randomUUID()}`,
  copy: block,
  offset: { x: 15, y: -35 },
});

test('copied embedded and subset text keeps font, weight, style, color and independent edits', async () => {
  for (const subset of [false, true]) {
    const bytes = await createEmbeddedFontPdf(subset);
    const before = await inspect(bytes);
    const copies = before.blocks.map((block) => copy(block));
    const result = (await processTextPdf(bytes, {
      operation: 'edit',
      changes: copies,
    })) as Uint8Array;
    const after = await inspect(result);
    assert.equal(after.blocks.length, before.blocks.length * 2);
    assert.equal(after.pageCount, 1);
    for (const block of before.blocks) {
      const pair = after.blocks.filter((item) => item.text === block.text);
      assert.equal(pair.length, 2);
      for (const item of pair) {
        assert.equal(item.font, block.font);
        assert.equal(item.fontWeight, block.fontWeight);
        assert.equal(item.fontItalic, block.fontItalic);
        assert.equal(item.color, block.color);
        assert.equal(item.size, block.size);
      }
      assert.ok(Math.abs(pair[1].bounds[0] - block.bounds[0] - 15) < 0.05);
    }
    const edited = (await processTextPdf(bytes, {
      operation: 'edit',
      changes: [
        { ...defaultTextChange(before.blocks[0]), text: 'Original changed' },
        ...copies.map((item, index) => (index ? item : { ...item, text: 'Independent copy 4' })),
      ],
    })) as Uint8Array;
    const texts = (await inspect(edited)).blocks.map((block) => block.text);
    assert.ok(texts.includes('Original changed'));
    assert.ok(texts.join(' ').includes('Independent copy 4'));
  }
});

test('copies persist in workspace snapshots and export after source page removal and reordering', async () => {
  const pdf = await PDFDocument.load(await createScaledTextPdf());
  pdf.addPage([500, 500]);
  const bytes = await pdf.save();
  const block = (await inspect(bytes)).blocks[0];
  const pasted = copy(block, 1);
  const state: EditorState = {
    pages: [{ id: 'kept', sourceIndex: 1, width: 500, height: 500, rotation: 0 }],
    annotations: [],
    formValues: {},
    textChanges: { kept: { [pasted.id]: pasted } },
  };
  const snapshot = { state, inspection: null, page: 0, flatten: false };
  assert.deepEqual(workspaceSchema.parse(snapshot), snapshot);
  const sources = [...state.pages, { ...state.pages[0], id: 'source', sourceIndex: 0 }];
  const arranged = await exportEditor(bytes, { pages: sources, annotations: [], formValues: {} });
  const changes = arrangedTextChanges(state, sources);
  assert.equal(changes[0].copy?.page, 1);
  assert.ok(changes[0].id.startsWith('0:'));
  const edited = (await processTextPdf(arranged, { operation: 'edit', changes })) as Uint8Array;
  const output = await exportEditor(edited, {
    pages: [{ ...state.pages[0], sourceIndex: 0 }],
    annotations: [],
    formValues: {},
  });
  const final = await inspect(output);
  assert.equal(final.pageCount, 1);
  assert.equal(final.blocks[0].text, block.text);
  assert.equal(final.blocks[0].font, block.font);
});

test('copying painted text preserves its appearance and never removes the original', async () => {
  for (const gradient of [false, true]) {
    const bytes = await paintedTextPdf(gradient);
    const block = (await inspect(bytes)).blocks.find((block) => block.text === 'scale')!;
    const result = (await processTextPdf(bytes, {
      operation: 'edit',
      changes: [copy(block)],
    })) as Uint8Array;
    const pair = (await inspect(result)).blocks.filter((item) => item.text === 'scale');
    assert.equal(pair.length, 2);
    assert.equal(pair[0].color, block.color);
    assert.equal(pair[1].color, block.color);
    if (gradient) assert.deepEqual(pair[1].paint?.colors, block.paint?.colors);
  }
});

test('clipped but visible text can be copied outside its original clipping region', async () => {
  const bytes = await clippedTextPdf();
  const before = await inspect(bytes);
  const block = before.blocks[0];
  const result = (await processTextPdf(bytes, {
    operation: 'edit',
    changes: [copy(block)],
  })) as Uint8Array;
  assert.equal((await inspect(result)).blocks.filter((item) => item.text === block.text).length, 2);
});

test('copy requests reject stale source text, invalid pages and non-text objects', async () => {
  const bytes = await createScaledTextPdf();
  const block = (await inspect(bytes)).blocks[0];
  await assert.rejects(
    processTextPdf(bytes, { operation: 'edit', changes: [{ ...copy(block), original: 'stale' }] }),
    /source text changed/,
  );
  await assert.rejects(
    processTextPdf(bytes, {
      operation: 'edit',
      changes: [{ ...copy(block), copy: { ...block, page: 999 } }],
    }),
    /valid text box/,
  );
  await assert.rejects(
    processTextPdf(bytes, {
      operation: 'edit',
      changes: [{ ...copy(block), copy: { ...block, objectIndex: 9999 } }],
    }),
    /source text could not be found/,
  );
});

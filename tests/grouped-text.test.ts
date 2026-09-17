import test from 'node:test';
import assert from 'node:assert/strict';
import { groupedTextPdf } from './fixtures/grouped-text-pdf';
import { processTextPdf } from '../scripts/pdf-text-engine.mjs';
import { defaultTextChange } from '../src/lib/editor-text';
import type { TextInspection } from '../src/lib/pro-types';
import { formInvocations } from '../src/lib/pdf-form-source.mjs';

test('grouped glyphs are editable lines and nested edits replace the original ink', async () => {
  const bytes = await groupedTextPdf();
  const before = (await processTextPdf(bytes, { operation: 'inspect' })) as TextInspection;
  assert.deepEqual(
    before.blocks.map((b) => b.text),
    ['Grouped heading', 'Unchanged supporting line', 'Nested job title'],
  );
  for (const target of before.blocks) {
    const edited = (await processTextPdf(bytes, {
      operation: 'edit',
      changes: [{ ...defaultTextChange(target), text: 'Changed text', offset: { x: 12, y: -8 } }],
    })) as Uint8Array;
    const after = (await processTextPdf(edited, { operation: 'inspect' })) as TextInspection;
    assert.equal(after.blocks.length, before.blocks.length);
    assert.ok(
      !after.blocks.some((b) => b.text === target.text),
      'Original ink must be removed from the saved PDF',
    );
    const replacement = after.blocks.find((b) => b.text === 'Changed text')!;
    assert.ok(replacement);
    assert.equal(replacement.font, target.font);
    assert.equal(replacement.color, target.color);
    assert.ok(Math.abs(replacement.matrix![4] - target.matrix![4] - 12) < 0.01);
    assert.ok(Math.abs(replacement.matrix![5] - target.matrix![5] + 8) < 0.01);
  }
});

test('editing a reused PDF group leaves its other appearance unchanged', async () => {
  const bytes = await groupedTextPdf({ repeated: true });
  const before = (await processTextPdf(bytes, { operation: 'inspect' })) as TextInspection;
  const target = before.blocks[0];
  const edited = (await processTextPdf(bytes, {
    operation: 'edit',
    changes: [{ ...defaultTextChange(target), text: 'Only one changed' }],
  })) as Uint8Array;
  const after = (await processTextPdf(edited, { operation: 'inspect' })) as TextInspection;
  assert.equal(after.blocks.length, before.blocks.length);
  assert.equal(after.blocks.filter((b) => b.text === target.text).length, 1);
});

test('edits inside multiple enclosing PDF groups survive reopening', async () => {
  const bytes = await groupedTextPdf({ deep: true });
  const before = (await processTextPdf(bytes, { operation: 'inspect' })) as TextInspection;
  const target = before.blocks[0];
  const edited = (await processTextPdf(bytes, {
    operation: 'edit',
    changes: [{ ...defaultTextChange(target), text: 'Changed nested line' }],
  })) as Uint8Array;
  const after = (await processTextPdf(edited, { operation: 'inspect' })) as TextInspection;
  assert.equal(after.blocks.length, before.blocks.length);
  assert.ok(!after.blocks.some((b) => b.text === target.text));
});

test('copying grouped text keeps the source and produces an editable copy', async () => {
  const bytes = await groupedTextPdf({ deep: true });
  const before = (await processTextPdf(bytes, { operation: 'inspect' })) as TextInspection;
  const target = before.blocks[0];
  const copy = {
    ...defaultTextChange(target),
    id: `${target.page}:${target.objectIndex}:11111111-1111-4111-8111-111111111111`,
    copy: target,
    text: 'Copied heading',
    offset: { x: 0, y: -60 },
  };
  const edited = (await processTextPdf(bytes, {
    operation: 'edit',
    changes: [copy],
  })) as Uint8Array;
  const after = (await processTextPdf(edited, { operation: 'inspect' })) as TextInspection;
  assert.equal(after.blocks.length, before.blocks.length + 1);
  assert.ok(after.blocks.some((b) => b.text === target.text));
  assert.ok(
    after.blocks.some(
      (b) => b.text === copy.text && b.color === target.color && b.font === target.font,
    ),
  );
});

test('form invocation parsing ignores PDF text, comments and property values', () => {
  const source =
    '/Real Do (ignore \\( /Fake Do) Tj % /Comment Do\n<2f48657820446f> Tj [(/Array Do)] TJ /Tag << /Key (/Property Do) >> BDC /Second#20Name Do EMC';
  assert.deepEqual(
    formInvocations(source)!.map((use) => use.value),
    ['/Real', '/Second#20Name'],
  );
  assert.equal(formInvocations('q BI /W 1 /H 1 ID binary EI Q /Form Do'), null);
});

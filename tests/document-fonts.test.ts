import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  documentFontFamily,
  findDocumentFont,
  isDocumentFont,
  searchDocumentFonts,
} from '../src/lib/document-font-registry.mjs';
import { loadDocumentFont } from '../src/lib/server/document-fonts.mjs';
import { processTextPdf } from '../scripts/pdf-text-engine.mjs';
import { exportEditor, inspectPdf } from '../src/lib/pdf-engine';
import { defaultTextChange } from '../src/lib/editor-text';
import { workspaceSchema } from '../src/lib/workspace-types';
import type { DocumentFont, TextInspection } from '../src/lib/pro-types';

async function source() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([500, 400]).drawText('Original receipt 123', { x: 50, y: 300, size: 20, font });
  return pdf.save();
}
test('catalog searches and validates actual families, weights and styles', () => {
  const first = searchDocumentFonts();
  assert.ok(first.count > 1800);
  assert.equal(first.fonts[0].id, 'inter');
  assert.equal(first.fonts.length, 24);
  const ids = new Set<string>();
  for (let page = 0; page < Math.ceil(first.count / 24); page++)
    for (const font of searchDocumentFonts('', page).fonts) ids.add(font.id);
  assert.equal(ids.size, first.count);
  assert.equal(searchDocumentFonts('  PaCiFiCo ').fonts[0].family, 'Pacifico');
  assert.ok(documentFontFamily('lora'));
  assert.ok(findDocumentFont('google:lora:700:italic'));
  assert.equal(isDocumentFont('google:pacifico:700:italic'), false);
  assert.equal(isDocumentFont('google:unknown-font:400:normal'), false);
  assert.equal(isDocumentFont('google:../../etc/passwd:400:normal'), false);
  assert.equal(isDocumentFont('https://example.com/font.ttf'), false);
});
test('new font selections and annotation fonts survive workspace validation', async () => {
  const bytes = await source();
  const { state } = await inspectPdf(bytes);
  const inspection = (await processTextPdf(bytes, { operation: 'inspect' })) as TextInspection;
  const change = {
    ...defaultTextChange(inspection.blocks[0]),
    font: 'google:lora:700:italic',
    text: 'Updated receipt 4',
  };
  const snapshot = {
    state: {
      ...state,
      textChanges: { 'page-0': { [change.id]: change } },
      annotations: [
        {
          id: 'text',
          pageId: 'page-0',
          kind: 'text',
          text: 'Saved font',
          x: 50,
          y: 130,
          width: 300,
          height: 40,
          color: '#202522',
          size: 20,
          opacity: 1,
          font: 'google:roboto:500:normal',
        },
      ],
    },
    inspection,
    page: 0,
    mode: 'original-text',
    flatten: false,
  };
  assert.deepEqual(workspaceSchema.parse(JSON.parse(JSON.stringify(snapshot))), snapshot);
  snapshot.state.annotations[0].font = 'google:pacifico:700:italic';
  assert.equal(workspaceSchema.safeParse(snapshot).success, false);
});
test('Google font instances retain their family and style in original text edits and added text exports', async () => {
  const bytes = await source();
  const inspection = (await processTextPdf(bytes, { operation: 'inspect' })) as TextInspection;
  const block = inspection.blocks[0];
  const faces: [DocumentFont, string][] = [
    ['google:lora:700:italic', 'Lora-BoldItalic'],
    ['google:roboto:500:normal', 'Roboto-Medium'],
    ['google:pacifico:400:normal', 'Pacifico-Regular'],
  ];
  for (const [font, name] of faces) {
    const changes = [
      { ...defaultTextChange(block), font, text: 'Updated café 1234', offset: { x: 15, y: -25 } },
    ];
    const preview = await processTextPdf(bytes, { operation: 'preview', changes, page: 0 });
    assert.ok(preview.preview);
    const output = (await processTextPdf(bytes, { operation: 'edit', changes })) as Uint8Array;
    const edited = (await processTextPdf(output, { operation: 'inspect' })) as TextInspection;
    assert.equal(edited.blocks[0].font, name);
    assert.equal(edited.blocks[0].text, changes[0].text);
    assert.equal(edited.blocks[0].matrix![4], block.matrix![4] + 15);
    assert.equal(edited.blocks[0].matrix![5], block.matrix![5] - 25);
    const { state } = await inspectPdf(bytes);
    state.annotations.push({
      id: 'added',
      pageId: state.pages[0].id,
      kind: 'text',
      text: 'Added café 5678',
      x: 50,
      y: 150,
      width: 380,
      height: 50,
      size: 20,
      color: '#202522',
      opacity: 1,
      font,
    });
    const exported = await exportEditor(bytes, state, false, loadDocumentFont);
    const added = (
      (await processTextPdf(exported, { operation: 'inspect' })) as TextInspection
    ).blocks.find((text) => text.text.startsWith('Added'));
    assert.ok(added?.font.includes(name), added?.font);
    assert.equal(added?.text, 'Added café 5678');
    state.annotations[0].text = 'Missing 🦊';
    await assert.rejects(
      exportEditor(bytes, state, false, loadDocumentFont),
      /does not contain all characters/,
    );
  }
});
test('direct PDF jobs reject unknown font references before loading a font', async () => {
  const bytes = await source();
  const block = ((await processTextPdf(bytes, { operation: 'inspect' })) as TextInspection)
    .blocks[0];
  await assert.rejects(
    processTextPdf(bytes, {
      operation: 'preview',
      page: 0,
      changes: [{ ...defaultTextChange(block), font: 'google:unknown:400:normal' }],
    }),
    /available text font/,
  );
  await assert.rejects(loadDocumentFont('google:lora:999:normal'), /available font and style/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { processTextPdf } from '../scripts/pdf-text-engine.mjs';
import { createSample } from '../src/lib/sample';
import type { TextInspection, TextBlock } from '../src/lib/pro-types';
async function text(bytes: Uint8Array, password?: string) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: bytes.slice(), password, useSystemFonts: true });
  try {
    const doc = await task.promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const content = await (await doc.getPage(i)).getTextContent();
      pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
function change(block: TextBlock, replacement: string) {
  return {
    id: block.id,
    original: block.text,
    text: replacement,
    font: block.replacementFont,
    size: block.size,
    color: block.color,
  };
}
test('Pro replaces actual source text and preserves unrelated pages', async () => {
  const source = await createSample();
  const inspection = (await processTextPdf(source, { operation: 'inspect' })) as TextInspection;
  const title = inspection.blocks.find((block) => block.text === 'A place to')!;
  assert.ok(title);
  const exported = (await processTextPdf(source, {
    operation: 'edit',
    changes: [change(title, 'A space to')],
  })) as Uint8Array;
  const before = await text(source),
    after = await text(exported);
  assert.match(before[0], /A place to/);
  assert.doesNotMatch(after[0], /A place to/);
  assert.match(after[0], /A space to/);
  assert.equal(after[1], before[1]);
  assert.equal(after[2], before[2]);
  assert.equal((await PDFDocument.load(exported)).getPageCount(), 3);
});
test('Pro supports styles, rotation, crop offsets, and deletion without altering other occurrences', async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([500, 600]);
  page.setCropBox(20, 30, 400, 500);
  page.setRotation(degrees(90));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText('Repeated text', { x: 70, y: 450, size: 15, font });
  page.drawText('Repeated text', { x: 70, y: 350, size: 15, font });
  page.drawRectangle({ x: 50, y: 250, width: 100, height: 30, color: rgb(0.2, 0.6, 0.2) });
  const bytes = await pdf.save();
  const inspection = (await processTextPdf(bytes, { operation: 'inspect' })) as TextInspection;
  assert.equal(inspection.blocks.length, 2);
  const exported = (await processTextPdf(bytes, {
    operation: 'edit',
    changes: [
      {
        ...change(inspection.blocks[0], 'Updated text'),
        font: 'Courier-Bold',
        size: 19,
        color: '#c44934',
      },
    ],
  })) as Uint8Array;
  const after = (await processTextPdf(exported, { operation: 'inspect' })) as TextInspection;
  assert.equal(after.blocks[0].text, 'Updated text');
  assert.equal(after.blocks[0].size, 19);
  assert.equal(after.blocks[0].font, 'Courier-Bold');
  assert.equal(after.blocks[0].color, '#c44934');
  assert.equal(after.blocks[1].text, 'Repeated text');
  const result = await PDFDocument.load(exported);
  assert.equal(result.getPage(0).getRotation().angle, 90);
  assert.deepEqual(result.getPage(0).getCropBox(), page.getCropBox());
  const deleted = (await processTextPdf(bytes, {
    operation: 'edit',
    changes: [change(inspection.blocks[0], '')],
  })) as Uint8Array;
  assert.equal(
    ((await processTextPdf(deleted, { operation: 'inspect' })) as TextInspection).blocks.length,
    1,
  );
});
test('Pro refuses stale identifiers, unsupported replacement text, scans, and invalid files clearly', async () => {
  const source = await createSample();
  const inspection = (await processTextPdf(source, { operation: 'inspect' })) as TextInspection;
  const edit = change(inspection.blocks[0], 'Changed');
  await assert.rejects(
    processTextPdf(source, {
      operation: 'edit',
      changes: [{ ...edit, original: 'different text' }],
    }),
    /changed since/,
  );
  await assert.rejects(
    processTextPdf(source, { operation: 'edit', changes: [{ ...edit, id: '99:0' }] }),
    /could not be edited/,
  );
  await assert.rejects(
    processTextPdf(source, { operation: 'edit', changes: [{ ...edit, text: 'مرحبا' }] }),
    /Latin/,
  );
  await assert.rejects(
    processTextPdf(source, { operation: 'edit', changes: [edit, edit] }),
    /more than once/,
  );
  await assert.rejects(
    processTextPdf(new Uint8Array([1, 2, 3]), { operation: 'inspect' }),
    /Choose a PDF/,
  );
  const blank = await PDFDocument.create();
  blank.addPage();
  assert.equal(
    ((await processTextPdf(await blank.save(), { operation: 'inspect' })) as TextInspection).blocks
      .length,
    0,
  );
});
test('password protection requires the correct password and preserves document text', async () => {
  const bytes = await createSample();
  const output = (await processTextPdf(bytes, {
    operation: 'protect',
    password: 'folio-test-passphrase',
  })) as Uint8Array;
  await assert.rejects(text(output), /password/i);
  await assert.rejects(text(output, 'wrong-password'), /password/i);
  assert.deepEqual(await text(output, 'folio-test-passphrase'), await text(bytes));
  await assert.rejects(processTextPdf(output, { operation: 'inspect' }), /unencrypted/);
  await assert.rejects(
    processTextPdf(bytes, { operation: 'protect', password: 'short' }),
    /at least 8/,
  );
  assert.match(Buffer.from(output).toString('latin1'), /\/AESV3/);
});

test('anonymous previews return bounded PNG pixels and never export edited PDF bytes', async () => {
  const source = await createSample(),
    original = source.slice();
  const inspection = (await processTextPdf(source, { operation: 'inspect' })) as TextInspection;
  const title = inspection.blocks.find((b) => b.text === 'A place to')!;
  const before = await processTextPdf(source, { operation: 'preview', changes: [], page: 0 });
  const result = await processTextPdf(source, {
    operation: 'preview',
    changes: [change(title, 'New words')],
    page: 0,
  });
  assert.equal('bytes' in result, false);
  assert.deepEqual(Object.keys(result).sort(), ['height', 'page', 'preview', 'width']);
  assert.equal(
    Buffer.from(result.preview, 'base64').subarray(0, 8).toString('hex'),
    '89504e470d0a1a0a',
  );
  assert.notEqual(result.preview, before.preview);
  assert.ok(result.width * result.height <= 1400000);
  assert.deepEqual(source, original);
  const second = await processTextPdf(source, {
    operation: 'preview',
    changes: [change(title, 'New words')],
    page: 1,
  });
  const secondOriginal = await processTextPdf(source, {
    operation: 'preview',
    changes: [],
    page: 1,
  });
  assert.equal(second.preview, secondOriginal.preview);
  await assert.rejects(
    processTextPdf(source, { operation: 'preview', changes: [], page: 99 }),
    /page/i,
  );
});

test('workspace export preserves independent text edits on reordered and duplicated pages with annotations', async () => {
  const { exportEditor, inspectPdf } = await import('../src/lib/pdf-engine');
  const { arrangedTextChanges, withoutTextChanges } = await import('../src/lib/editor-text');
  const source = await createSample();
  const { state } = await inspectPdf(source);
  const inspection = (await processTextPdf(source, { operation: 'inspect' })) as TextInspection;
  const title = inspection.blocks.find((block) => block.text === 'A place to')!;
  const first = state.pages[0],
    duplicate = { ...first, id: 'duplicate', rotation: 90 };
  state.pages = [state.pages[2], duplicate, first];
  state.textChanges = {
    [first.id]: { [title.id]: change(title, 'Original page edit') },
    [duplicate.id]: { [title.id]: change(title, 'Duplicate page edit') },
  };
  state.annotations = [
    {
      id: 'annotation',
      pageId: first.id,
      kind: 'text',
      text: 'Keep this annotation',
      x: 30,
      y: 130,
      width: 220,
      height: 30,
      size: 14,
      color: '#000000',
      opacity: 1,
    },
  ];
  await assert.rejects(exportEditor(source, state), /finished-document export/);
  const arranged = await exportEditor(source, {
    pages: state.pages,
    annotations: [],
    formValues: {},
  });
  const edited = (await processTextPdf(arranged, {
    operation: 'edit',
    changes: arrangedTextChanges(state),
  })) as Uint8Array;
  const output = await exportEditor(edited, {
    ...withoutTextChanges(state),
    pages: state.pages.map((page, sourceIndex) => ({ ...page, sourceIndex })),
  });
  const pages = await text(output);
  assert.match(pages[0], /The next chapter/);
  assert.match(pages[1], /Duplicate page edit/);
  assert.doesNotMatch(pages[1], /Original page edit|Keep this annotation|A place to/);
  assert.match(pages[2], /Original page edit/);
  assert.match(pages[2], /Keep this annotation/);
  assert.doesNotMatch(pages[2], /Duplicate page edit|A place to/);
  assert.equal((await PDFDocument.load(output)).getPage(1).getRotation().angle, 90);
  const portrait = await processTextPdf(source, {
    operation: 'preview',
    changes: [],
    page: 0,
    rotation: 0,
  });
  const landscape = await processTextPdf(source, {
    operation: 'preview',
    changes: [change(title, 'Rotated preview')],
    page: 0,
    rotation: 90,
  });
  assert.ok(portrait.height > portrait.width);
  assert.ok(landscape.width > landscape.height);
});

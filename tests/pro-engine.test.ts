import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { processTextPdf } from '../scripts/pdf-text-engine.mjs';
import { processTextPdf as processPreview } from '../src/lib/pdf-text-engine.mjs';
import { createSample } from '../src/lib/sample';
import type { TextInspection, TextBlock } from '../src/lib/pro-types';
import { createScaledTextPdf } from './fixtures/scaled-text-pdf';
import { createEmbeddedFontPdf } from './fixtures/embedded-font-pdf';
import { createReceiptNumberPdf } from './fixtures/receipt-number-pdf';
import { createSubsetFontPdf } from './fixtures/subset-font-pdf';
import { createEncodedReceiptPdf } from './fixtures/encoded-receipt-pdf';
import { defaultTextChange } from '../src/lib/editor-text';
import { workspaceSchema } from '../src/lib/workspace-types';
import { pdfTextSizeFromPoints, pdfTextSizeInPoints } from '../src/lib/pdf-text-size.mjs';
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
test('preview-only platforms reject PDF export before loading a document', async () => {
  for (const operation of ['edit', 'protect'])
    await assert.rejects(
      processPreview(new Uint8Array(), { operation }, { allowExport: false }),
      /Use the download action/,
    );
});
function change(block: TextBlock, replacement: string) {
  return {
    id: block.id,
    original: block.text,
    text: replacement,
    font: defaultTextChange(block).font,
    size: block.size,
    color: block.color,
  };
}
test('page inspection retains source object IDs and marks empty pages without scanning unrelated pages', async () => {
  const source = await createSample();
  const full = (await processTextPdf(source, { operation: 'inspect' })) as TextInspection;
  for (let page = 0; page < full.pageCount; page++) {
    const partial = (await processTextPdf(source, {
      operation: 'inspect',
      page,
    })) as TextInspection;
    assert.equal(partial.pageCount, full.pageCount);
    assert.deepEqual(partial.pages, [page]);
    assert.deepEqual(
      partial.blocks,
      full.blocks.filter((block) => block.page === page),
    );
    const block = partial.blocks[0];
    if (block) {
      const output = (await processTextPdf(source, {
        operation: 'edit',
        changes: [change(block, 'Page edit')],
      })) as Uint8Array;
      assert.ok((await text(output))[page].includes('Page edit'));
    }
  }
  await assert.rejects(
    processTextPdf(source, { operation: 'inspect', page: full.pageCount }),
    /could not be edited/,
  );
  const blank = await PDFDocument.create();
  blank.addPage();
  const empty = (await processTextPdf(await blank.save(), {
    operation: 'inspect',
    page: 0,
  })) as TextInspection;
  assert.deepEqual(empty.pages, [0]);
  assert.deepEqual(empty.blocks, []);
});
test('editing embedded fonts retains their family, weight, italic style and rendering', async () => {
  const source = await createEmbeddedFontPdf();
  const before = (await processTextPdf(source, { operation: 'inspect' })) as TextInspection;
  assert.equal(before.blocks.length, 3);
  for (const block of before.blocks) {
    const edit = change(block, block.text.replace('Original', 'Updated'));
    assert.equal(edit.font, 'original');
    const exported = (await processTextPdf(source, {
      operation: 'edit',
      changes: [edit],
    })) as Uint8Array;
    const after = (await processTextPdf(exported, { operation: 'inspect' })) as TextInspection;
    assert.deepEqual(
      after.blocks.map(({ text: _text, bounds: _bounds, ...style }) => style),
      before.blocks.map(({ text: _text, bounds: _bounds, ...style }) => style),
    );
    assert.equal(after.blocks[block.objectIndex].text, edit.text);
    const preview = await processTextPdf(source, {
      operation: 'preview',
      changes: [edit],
      page: 0,
    });
    assert.ok(preview.preview);
  }
  const originalPreview = await processTextPdf(source, {
    operation: 'preview',
    changes: [],
    page: 0,
  });
  const unchangedPreview = await processTextPdf(source, {
    operation: 'preview',
    changes: before.blocks.map(defaultTextChange),
    page: 0,
  });
  assert.equal(unchangedPreview.preview, originalPreview.preview);
});

test('known subset fonts are completed with the same family and weight for all receipt digits', async () => {
  const source = await createReceiptNumberPdf('geist');
  const inspection = (await processTextPdf(source, { operation: 'inspect' })) as TextInspection;
  const block = inspection.blocks[0];
  assert.ok(!block.fontCharacters?.includes('4'));
  const output = (await processTextPdf(source, {
    operation: 'edit',
    changes: [change(block, '0123456789')],
  })) as Uint8Array;
  const after = (await processTextPdf(output, { operation: 'inspect' })) as TextInspection;
  assert.equal(after.blocks[0].text, '0123456789');
  assert.equal(after.blocks[0].font, 'GeistMono-SemiBold');
  assert.equal(after.blocks[0].fontWeight, 600);
  assert.equal(after.blocks[0].size, block.size);
  assert.deepEqual(after.blocks[0].matrix, block.matrix);
  assert.ok(after.blocks[0].fontCharacters?.includes('4'));
});

test('subset fonts preserve available characters and complete known fonts for new characters', async () => {
  const source = await createEmbeddedFontPdf(true);
  const inspection = (await processTextPdf(source, { operation: 'inspect' })) as TextInspection;
  const block = inspection.blocks[0];
  const result = (await processTextPdf(source, {
    operation: 'edit',
    changes: [change(block, 'Original receipt')],
  })) as Uint8Array;
  const after = (await processTextPdf(result, { operation: 'inspect' })) as TextInspection;
  assert.equal(after.blocks[0].font, block.font);
  assert.equal(after.blocks[0].text, 'Original receipt');
  const completed = (await processTextPdf(source, {
    operation: 'edit',
    changes: [change(block, 'Missing Z')],
  })) as Uint8Array;
  assert.equal(
    ((await processTextPdf(completed, { operation: 'inspect' })) as TextInspection).blocks[0].text,
    'Missing Z',
  );
  const fallback = (await processTextPdf(source, {
    operation: 'edit',
    changes: [{ ...change(block, 'Missing Z'), font: 'Helvetica' }],
  })) as Uint8Array;
  assert.equal(
    ((await processTextPdf(fallback, { operation: 'inspect' })) as TextInspection).blocks[0].text,
    'Missing Z',
  );
});
test('unavailable fonts substitute only missing characters with matching serif, sans, mono, bold and italic faces', async () => {
  for (const category of ['Sans', 'Serif', 'Mono'] as const) {
    for (const style of ['Regular', 'Bold', 'Italic', 'BoldItalic']) {
      const source = await createSubsetFontPdf(category, style);
      const before = (await processTextPdf(source, { operation: 'inspect' })) as TextInspection;
      const block = before.blocks[0];
      assert.equal(block.fontCharacters?.includes('4'), false);
      const output = (await processTextPdf(source, {
        operation: 'edit',
        changes: [change(block, 'Original 4Z receipt')],
      })) as Uint8Array;
      const after = (await processTextPdf(output, { operation: 'inspect' })) as TextInspection;
      assert.equal(
        after.blocks
          .map((b) => b.text)
          .join('')
          .replace(/\s+/g, ' '),
        'Original 4Z receipt',
      );
      assert.equal(after.blocks[0].font, block.font);
      assert.equal(after.blocks[2].font, block.font);
      assert.equal(after.blocks[1].text.trim(), '4Z');
      assert.equal(
        after.blocks[1].font,
        `Liberation${category}${style === 'Regular' ? '' : `-${style}`}`,
      );
      assert.ok(after.blocks[1].fontCharacters?.includes('4'));
    }
  }
});
test('text movement preserves style and physical placement with scaled and replacement fonts', async () => {
  const source = await createScaledTextPdf();
  const original = ((await processTextPdf(source, { operation: 'inspect' })) as TextInspection)
    .blocks[0];
  for (const font of ['original', 'Times-Italic'] as const) {
    const moved = { ...change(original, 'Moved receipt'), font, offset: { x: 35, y: -60 } };
    const output = (await processTextPdf(source, {
      operation: 'edit',
      changes: [moved],
    })) as Uint8Array;
    const after = ((await processTextPdf(output, { operation: 'inspect' })) as TextInspection)
      .blocks[0];
    assert.equal(after.matrix![4], original.matrix![4] + 35);
    assert.equal(after.matrix![5], original.matrix![5] - 60);
    assert.deepEqual(after.matrix!.slice(0, 4), original.matrix!.slice(0, 4));
  }
  for (const offset of [
    { x: NaN, y: 0 },
    { x: 100001, y: 0 },
    { x: 0, y: Infinity },
  ]) {
    await assert.rejects(
      processTextPdf(source, {
        operation: 'edit',
        changes: [{ ...change(original, 'Moved receipt'), offset }],
      }),
    );
  }
});
test('moving and resizing original encoded text preserves its glyphs without accepting new control characters', async () => {
  const source = await createEncodedReceiptPdf();
  const before = (await processTextPdf(source, { operation: 'inspect' })) as TextInspection;
  const original = before.blocks.find((block) => block.text.includes('\u0002'))!;
  assert.ok(original);
  const moved = {
    ...defaultTextChange(original),
    size: original.size * 1.25,
    offset: { x: 35, y: -40 },
  };
  const other = change(before.blocks[1], 'Updated total');
  const preview = await processTextPdf(source, {
    operation: 'preview',
    page: 0,
    changes: [moved, other],
  });
  assert.ok(preview.preview);
  const output = (await processTextPdf(source, {
    operation: 'edit',
    changes: [moved, other],
  })) as Uint8Array;
  const after = (await processTextPdf(output, { operation: 'inspect' })) as TextInspection;
  assert.equal(after.blocks[0].text, original.text);
  assert.equal(after.blocks[0].font, original.font);
  assert.equal(after.blocks[0].matrix![4], original.matrix![4] + 35);
  assert.equal(after.blocks[0].matrix![5], original.matrix![5] - 40);
  assert.equal(after.blocks[1].text, 'Updated total');
  for (const patch of [{ text: original.text + '\u0002' }, { font: 'Helvetica' }])
    await assert.rejects(
      processTextPdf(source, { operation: 'edit', changes: [{ ...moved, ...patch }] }),
      /New text supports Latin/,
    );
  await assert.rejects(
    processTextPdf(source, {
      operation: 'edit',
      changes: [{ ...moved, original: '\u0002', text: '\u0002' }],
    }),
    /changed since/,
  );
});

test('scaled receipt text previews, survives workspace serialization, and exports at its original size', async () => {
  const source = await createScaledTextPdf();
  const inspection = (await processTextPdf(source, { operation: 'inspect' })) as TextInspection;
  const blocks = inspection.blocks.slice(0, 3);
  assert.deepEqual(
    blocks.map((block) => block.size),
    [1, 0.5, 200],
  );
  blocks.forEach((block, index) => {
    assert.ok(Math.abs(pdfTextSizeInPoints(block, block.size) - [14, 12, 10][index]) < 0.0001);
  });
  const changes = blocks.map((block, index) => change(block, `Updated ${index + 1}`));
  const snapshot = workspaceSchema.parse({
    state: {
      pages: [{ id: 'receipt', sourceIndex: 0, width: 300, height: 500, rotation: 0 }],
      annotations: [],
      formValues: {},
      textChanges: { receipt: Object.fromEntries(changes.map((edit) => [edit.id, edit])) },
    },
    inspection,
    page: 0,
    mode: 'original-text',
    flatten: false,
  });
  const restored = workspaceSchema.parse(JSON.parse(JSON.stringify(snapshot)));
  const restoredChanges = Object.values(restored.state.textChanges!.receipt);
  const preview = await processTextPdf(source, {
    operation: 'preview',
    page: 0,
    changes: restoredChanges,
  });
  assert.ok(preview.preview);
  const exported = (await processTextPdf(source, {
    operation: 'edit',
    changes: restoredChanges,
  })) as Uint8Array;
  const after = (await processTextPdf(exported, { operation: 'inspect' })) as TextInspection;
  for (const [index, original] of blocks.entries()) {
    assert.equal(after.blocks[index].text, `Updated ${index + 1}`);
    assert.equal(after.blocks[index].size, original.size);
    assert.deepEqual(after.blocks[index].matrix, original.matrix);
  }
  assert.equal(after.blocks[3].text, 'Keep this receipt');
  const resized = (await processTextPdf(source, {
    operation: 'edit',
    changes: [{ ...changes[0], size: pdfTextSizeFromPoints(blocks[0], 18) }],
  })) as Uint8Array;
  const resizedBlock = ((await processTextPdf(resized, { operation: 'inspect' })) as TextInspection)
    .blocks[0];
  assert.ok(Math.abs(pdfTextSizeInPoints(resizedBlock, resizedBlock.size) - 18) < 0.0001);
  for (const size of [0, -1, NaN, Infinity, 10001]) {
    await assert.rejects(
      processTextPdf(source, { operation: 'preview', page: 0, changes: [{ ...changes[0], size }] }),
      /valid positive text size/,
    );
    assert.equal(
      workspaceSchema.safeParse({
        ...snapshot,
        state: {
          ...snapshot.state,
          textChanges: { receipt: { [changes[0].id]: { ...changes[0], size } } },
        },
      }).success,
      false,
    );
  }
});
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
    [duplicate.id]: {
      [title.id]: { ...change(title, 'Duplicate page edit'), offset: { x: 22, y: -35 } },
    },
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
  const inspectedEdits = (await processTextPdf(edited, { operation: 'inspect' })) as TextInspection;
  const movedDuplicate = inspectedEdits.blocks.find(
    (block) => block.text === 'Duplicate page edit',
  )!;
  const unchangedPosition = inspectedEdits.blocks.find(
    (block) => block.text === 'Original page edit',
  )!;
  assert.equal(movedDuplicate.matrix![4], unchangedPosition.matrix![4] + 22);
  assert.equal(movedDuplicate.matrix![5], unchangedPosition.matrix![5] - 35);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, PDFDict, PDFName, degrees, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { createSample } from '../src/lib/sample';
import { exportEditor, inspectPdf, pagePoint, processPdf } from '../src/lib/pdf-engine';
import { friendlyError, parsePages } from '../src/lib/utils';
import type { Annotation } from '../src/lib/types';
import { processTextPdf } from '../scripts/pdf-text-engine.mjs';
import { PNG } from 'pngjs';
import type { TextPreview } from '../src/lib/pro-types';

const sample = await createSample();
const input = { name: 'proposal.pdf', bytes: sample };
async function extractText(bytes: Uint8Array, pageNumber = 1) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: bytes.slice(), useSystemFonts: true });
  try {
    const doc = await loading.promise;
    const content = await (await doc.getPage(pageNumber)).getTextContent();
    return content.items.map((i) => ('str' in i ? i.str : '')).join(' ');
  } finally {
    await loading.destroy();
  }
}
test('merging preserves page order and source documents', async () => {
  const one = await PDFDocument.create();
  const p = one.addPage([300, 400]);
  p.drawText('A separate appendix');
  const output = await processPdf('merge', [
    input,
    { name: 'appendix.pdf', bytes: await one.save() },
  ]);
  const merged = await PDFDocument.load(output.bytes);
  assert.equal(merged.getPageCount(), 4);
  assert.equal(merged.getPage(3).getWidth(), 300);
  assert.match(await extractText(output.bytes, 4), /A separate appendix/);
  assert.equal((await PDFDocument.load(sample)).getPageCount(), 3);
});
test('extracting and splitting export the requested pages', async () => {
  const output = await processPdf('extract', [input], { pages: [2, 0] });
  const doc = await PDFDocument.load(output.bytes);
  assert.equal(doc.getPageCount(), 2);
  assert.match(await extractText(output.bytes, 1), /The next chapter/);
  const split = await processPdf('split', [input], { pages: [0, 2] });
  const zip = await JSZip.loadAsync(split.bytes);
  assert.equal(Object.keys(zip.files).length, 2);
  for (const f of Object.values(zip.files))
    assert.equal((await PDFDocument.load(await f.async('uint8array'))).getPageCount(), 1);
});
test('rotations, crop boundaries, and numbered footers are saved', async () => {
  const rotated = await processPdf('rotate', [input], { pages: [1], rotation: 90 });
  const r = await PDFDocument.load(rotated.bytes);
  assert.equal(r.getPage(1).getRotation().angle, 90);
  assert.equal(r.getPage(0).getRotation().angle, 0);
  const cropped = await processPdf('crop', [input], { pages: [0], margin: 20 });
  assert.deepEqual((await PDFDocument.load(cropped.bytes)).getPage(0).getCropBox(), {
    x: 20,
    y: 20,
    width: 555,
    height: 802,
  });
  const numbered = await processPdf('numbers', [input], { pages: [1, 2], start: 42 });
  assert.match(await extractText(numbered.bytes, 2), /42/);
  assert.match(await extractText(numbered.bytes, 3), /43/);
  await assert.rejects(processPdf('crop', [input], { margin: 400 }), /visible area/);
});
test('invalid watermark and numbering settings never silently produce a different document', async () => {
  for (const options of [
    { text: '' },
    { text: '   ' },
    { text: 'Two\nlines' },
    { size: 0 },
    { size: NaN },
    { opacity: 0 },
    { opacity: 1.1 },
    { opacity: -1 },
    { color: 'invalid' },
  ])
    await assert.rejects(processPdf('watermark', [input], options));
  for (const start of [0, -1, 1.5, Infinity, NaN])
    await assert.rejects(processPdf('numbers', [input], { start }), /positive whole/);
  const result = await processPdf('watermark', [input], {
    text: 'APPROVED',
    pages: [1],
    size: 30,
    opacity: 0.6,
    color: '#7436ff',
  });
  assert.doesNotMatch(await extractText(result.bytes, 1), /APPROVED/);
  assert.match(await extractText(result.bytes, 2), /APPROVED/);
});
test('non-text PDF operations do not embed unused fonts', async () => {
  const countFonts = (doc: PDFDocument) =>
    doc.context
      .enumerateIndirectObjects()
      .filter(
        ([, object]) =>
          object instanceof PDFDict && object.get(PDFName.of('Type')) === PDFName.of('Font'),
      ).length;
  const original = countFonts(await PDFDocument.load(sample));
  for (const operation of ['rotate', 'crop', 'compress'] as const) {
    const result = await processPdf(operation, [input]);
    assert.equal(countFonts(await PDFDocument.load(result.bytes)), original, operation);
  }
});
test('password validation messages remain relevant to the tool', () => {
  assert.equal(friendlyError(new Error('Enter the Wi-Fi password.')), 'Enter the Wi-Fi password.');
  assert.equal(
    friendlyError(new Error('The passwords do not match.')),
    'The passwords do not match.',
  );
  assert.match(friendlyError(new Error('The PDF is encrypted')), /password protected/);
  const password = new Error('No password given');
  password.name = 'PasswordException';
  assert.match(friendlyError(password), /password protected/);
});
test('editing exports text, reordering, blank pages, and field values', async () => {
  const { state } = await inspectPdf(sample);
  const annotation: Annotation = {
    id: 'note',
    pageId: state.pages[0].id,
    kind: 'text',
    x: 40,
    y: 40,
    width: 260,
    height: 30,
    text: 'Reviewed by Alex Morgan',
    color: '#202522',
    size: 16,
    opacity: 1,
  };
  state.annotations.push(annotation);
  state.pages = [
    state.pages[2],
    state.pages[0],
    { id: 'blank', sourceIndex: null, width: 595, height: 842, rotation: 0 },
  ];
  const bytes = await exportEditor(sample, state);
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 3);
  assert.match(await extractText(bytes, 2), /Reviewed by Alex Morgan/);
  assert.doesNotMatch(await extractText(sample), /Reviewed by Alex Morgan/);
  assert.match(await extractText(bytes, 1), /The next chapter/);
});
test('existing form values remain fillable, and flattening removes fields', async () => {
  const bytes = await createSample('onboarding');
  const { state } = await inspectPdf(bytes);
  state.formValues['Full name'] = 'Alex Morgan';
  state.formValues['Email address'] = 'alex@example.com';
  const filled = await exportEditor(bytes, state);
  assert.equal(
    (await PDFDocument.load(filled)).getForm().getTextField('Full name').getText(),
    'Alex Morgan',
  );
  const flat = await exportEditor(bytes, state, true);
  assert.equal((await PDFDocument.load(flat)).getForm().getFields().length, 0);
  assert.match(await extractText(flat), /Alex Morgan/);
});
test('new fields export their values and reject duplicate names', async () => {
  const { state } = await inspectPdf(sample);
  const field: Annotation = {
    id: 'field',
    pageId: state.pages[0].id,
    kind: 'field',
    text: 'Contact',
    x: 40,
    y: 40,
    width: 200,
    height: 30,
    color: '#202522',
    size: 12,
    opacity: 1,
    required: true,
  };
  state.annotations.push(field);
  state.formValues.Contact = 'Taylor';
  const bytes = await exportEditor(sample, state);
  const form = (await PDFDocument.load(bytes)).getForm();
  assert.equal(form.getTextField('Contact').getText(), 'Taylor');
  assert.equal(form.getTextField('Contact').isRequired(), true);
  state.annotations.push({ ...field, id: 'duplicate' });
  await assert.rejects(exportEditor(sample, state), /already exists/);
});
test('optimization never claims a reduction while returning a larger file', async () => {
  const optimized = await processPdf('compress', [input]);
  assert.ok(optimized.bytes.length <= sample.length);
  if (optimized.note) assert.deepEqual(optimized.bytes, sample);
});
test('page ranges fail clearly for invalid and out-of-bounds input', () => {
  assert.deepEqual(parsePages('1-3, 5, 2', 6), [0, 1, 2, 4]);
  assert.deepEqual(parsePages('', 2), [0, 1]);
  for (const value of ['0', '9', '4-2', '1,,2', 'a', '1.5'])
    assert.throws(() => parsePages(value, 6));
});
test('annotation transforms respect rotated crop boxes', async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);
  page.setCropBox(20, 30, 500, 700);
  assert.deepEqual(pagePoint(page, 0, 10, 15), { x: 30, y: 715 });
  assert.deepEqual(pagePoint(page, 90, 10, 15), { x: 35, y: 40 });
  assert.deepEqual(pagePoint(page, 180, 10, 15), { x: 510, y: 45 });
  assert.deepEqual(pagePoint(page, 270, 10, 15), { x: 505, y: 720 });
  page.setRotation(degrees(90));
  page.drawText('Original sideways page', { x: 60, y: 100, color: rgb(0, 0, 0) });
  const original = await doc.save();
  const { state } = await inspectPdf(original);
  state.annotations.push({
    id: 'rotated',
    pageId: state.pages[0].id,
    kind: 'text',
    text: 'Aligned note',
    x: 30,
    y: 30,
    width: 150,
    height: 30,
    size: 14,
    color: '#202522',
    opacity: 1,
  });
  const output = await exportEditor(original, state);
  assert.match(await extractText(output), /Aligned note/);
  assert.equal((await PDFDocument.load(output)).getPage(0).getRotation().angle, 90);
});

test('new editor marks render in their visible positions on rotated, cropped PDFs', async () => {
  for (const rotation of [0, 90, 180, 270]) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([400, 400]);
    page.setCropBox(50, 50, 300, 300);
    page.setRotation(degrees(rotation));
    page.drawRectangle({ x: 175, y: 175, width: 50, height: 50, color: rgb(0, 0, 0) });
    page.drawText('Original content remains', { x: 80, y: 110, size: 10 });
    const source = await pdf.save();
    const { state } = await inspectPdf(source);
    const mark = (
      kind: Annotation['kind'],
      x: number,
      y: number,
      width: number,
      height: number,
    ): Annotation => ({
      id: kind,
      pageId: state.pages[0].id,
      kind,
      x,
      y,
      width,
      height,
      text: '',
      size: 2,
      color: '#cc0000',
      opacity: 1,
    });
    state.annotations = [
      mark('ellipse', 20, 20, 70, 40),
      mark('cross', 110, 20, 30, 30),
      mark('check', 170, 20, 30, 30),
      mark('line', 230, 20, 40, 12),
      { ...mark('whiteout', 135, 135, 30, 30), color: '#ffffff' },
    ];
    const output = await exportEditor(source, state);
    const preview = (await processTextPdf(output, {
      operation: 'preview',
      page: 0,
      changes: [],
    })) as TextPreview;
    const png = PNG.sync.read(Buffer.from(preview.preview, 'base64'));
    const scale = png.width / 300;
    for (const a of state.annotations.filter((a) => a.kind !== 'whiteout')) {
      let redPixels = 0;
      for (let y = Math.floor(a.y * scale); y < (a.y + a.height) * scale; y++) {
        for (let x = Math.floor(a.x * scale); x < (a.x + a.width) * scale; x++) {
          const offset = (y * png.width + x) * 4;
          if (png.data[offset] > 100 && png.data[offset + 1] < 80 && png.data[offset + 2] < 80)
            redPixels++;
        }
      }
      assert.ok(redPixels > 40, `${a.kind} is visible at its position after ${rotation}° rotation`);
    }
    const center = (Math.round(150 * scale) * png.width + Math.round(150 * scale)) * 4;
    assert.deepEqual([...png.data.subarray(center, center + 3)], [255, 255, 255]);
    assert.match(await extractText(output), /Original content remains/);
  }
});

test('links and Unicode comments export as working PDF annotations with rotated hit areas', async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([600, 800]);
  page.setCropBox(20, 30, 500, 700);
  page.setRotation(degrees(90));
  const source = await pdf.save();
  const { state } = await inspectPdf(source);
  const base: Annotation = {
    id: 'link',
    pageId: state.pages[0].id,
    kind: 'link',
    x: 30,
    y: 45,
    width: 180,
    height: 28,
    text: '',
    color: '#202522',
    size: 12,
    opacity: 1,
    url: 'https://example.com/report?q=one#details',
  };
  state.annotations = [
    base,
    { ...base, id: 'comment', kind: 'comment', x: 260, width: 28, text: 'Please review — شکریہ' },
  ];
  const exported = await exportEditor(source, state);
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const viewer = getDocument({ data: exported, useSystemFonts: true });
  try {
    const page = await (await viewer.promise).getPage(1);
    const annotations = await page.getAnnotations();
    const link = annotations.find((a) => a.subtype === 'Link')!;
    const comment = annotations.find((a) => a.subtype === 'Text')!;
    assert.equal(link.url, base.url);
    assert.equal(comment.contentsObj.str, 'Please review — شکریہ');
    const viewport = page.getViewport({ scale: 1 });
    const rect = [
      ...viewport.convertToViewportPoint(link.rect[0], link.rect[1]),
      ...viewport.convertToViewportPoint(link.rect[2], link.rect[3]),
    ];
    assert.deepEqual(
      [
        Math.min(rect[0], rect[2]),
        Math.min(rect[1], rect[3]),
        Math.abs(rect[2] - rect[0]),
        Math.abs(rect[3] - rect[1]),
      ],
      [30, 45, 180, 28],
    );
  } finally {
    await viewer.destroy();
  }
  for (const url of [
    '',
    'javascript:alert(1)',
    'file:///tmp/private.pdf',
    'data:text/html,test',
    'https://user:password@example.com',
    'https://example.com/\nunsafe',
  ]) {
    state.annotations = [{ ...base, url }];
    await assert.rejects(exportEditor(source, state), Error, url);
  }
  state.annotations = [{ ...base, url: 'mailto:hello@example.com' }];
  assert.ok((await exportEditor(source, state)).length > 0);
});

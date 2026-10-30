import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import sharp from 'sharp';
import { exportEditor, inspectPdf, processPdf } from '../src/lib/pdf-engine';

// Reproduce the two guide exercises with the same engine used by the app.
// Existing fictional inputs are retained; no customer documents or external services.
const directory = new URL('../public/samples/', import.meta.url);
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const input = async (name: string, type: string) => ({
  name,
  type,
  bytes: new Uint8Array(await readFile(new URL(name, directory))),
});
async function pageText(bytes: Uint8Array, page = 1) {
  const task = getDocument({ data: bytes.slice(), useSystemFonts: true });
  try {
    const content = await (await (await task.promise).getPage(page)).getTextContent();
    return content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
  } finally {
    await task.destroy();
  }
}
const portrait = await input('a4-portrait-practice.pdf', 'application/pdf');
const { state } = await inspectPdf(portrait.bytes);
const note = 'Reviewed by Sam / 30 October 2026';
state.annotations.push({
  id: 'practice-note',
  pageId: state.pages[0].id,
  kind: 'text',
  x: 52,
  y: 420,
  width: 330,
  height: 32,
  text: note,
  color: '#202522',
  size: 14,
  opacity: 1,
});
const annotated = await exportEditor(portrait.bytes, state);
const annotatedPdf = await PDFDocument.load(annotated);
assert.equal(annotatedPdf.getPageCount(), 1);
assert.deepEqual(annotatedPdf.getPage(0).getSize(), { width: 595.28, height: 841.89 });
const before = await pageText(portrait.bytes);
const after = await pageText(annotated);
assert.ok(!before.includes(note));
assert.ok(after.includes(note));
assert.ok(after.includes('Portrait report'));
await writeFile(new URL('add-text-worked-result.pdf', directory), annotated);

const images = [
  await input('practice-receipt.jpg', 'image/jpeg'),
  await input('practice-screenshot.png', 'image/png'),
];
const dimensions = await Promise.all(images.map((image) => sharp(image.bytes).metadata()));
const examples = [];
for (const a4 of [true, false]) {
  const result = await processPdf('images', images, { a4 });
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(), 2);
  const pages = pdf.getPages().map((page) => page.getSize());
  for (const [index, page] of pages.entries()) {
    assert.deepEqual(
      page,
      a4
        ? { width: 595.28, height: 841.89 }
        : { width: dimensions[index].width! * 0.75, height: dimensions[index].height! * 0.75 },
    );
    assert.equal((await pageText(result.bytes, index + 1)).trim(), '');
  }
  const name = `images-${a4 ? 'a4' : 'fitted'}-worked-result.pdf`;
  await writeFile(new URL(name, directory), result.bytes);
  examples.push({
    source: `/samples/${name}`,
    sha256: hash(result.bytes),
    pageSizes: pages,
    selectableText: false,
  });
}
const evidence = {
  checkedAt: new Date().toISOString(),
  method:
    'Folio exportEditor and processPdf(images), followed by PDF.js text extraction and pdf-lib page inspection.',
  limitations:
    'Fictional inputs and first-party engine checks. Not a benchmark, independent review, or promise for other documents. Visual placement should also be checked in a PDF reader.',
  engineSha256: hash(await readFile(new URL('../src/lib/pdf-engine.ts', import.meta.url))),
  annotation: {
    source: '/samples/add-text-worked-result.pdf',
    sha256: hash(annotated),
    pageSize: annotatedPdf.getPage(0).getSize(),
    originalHeadingRetained: true,
    addedText: note,
    addedTextSelectable: true,
  },
  imageInputs: images.map((image, index) => ({
    source: `/samples/${image.name}`,
    sha256: hash(image.bytes),
    width: dimensions[index].width,
    height: dimensions[index].height,
  })),
  examples,
};
await writeFile(
  new URL('../src/lib/guide-exercises.json', import.meta.url),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
console.log(JSON.stringify(evidence, null, 2));

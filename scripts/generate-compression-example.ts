import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { processPdf } from '../src/lib/pdf-engine';

// A controlled first-party example, not a benchmark of other products or customer files.
const directory = new URL('../public/samples/', import.meta.url);
await mkdir(directory, { recursive: true });
const document = await PDFDocument.create();
document.setTitle('Folio compression practice');
document.setAuthor('Folio');
document.setCreator('Folio compression example generator');
document.setCreationDate(new Date('2026-10-06T00:00:00Z'));
document.setModificationDate(new Date('2026-10-06T00:00:00Z'));
const font = await document.embedFont(StandardFonts.Helvetica);
const page = document.addPage([595.28, 841.89]);
const lines = [
  'Folio compression practice',
  'One fictional page. Two ways to store the same PDF objects.',
  'Try each version in Compress PDF and compare the file sizes.',
  'No photographs, customer information or hidden padding are included.',
  'A smaller file is useful only when the contents remain readable.',
];
lines.forEach((text, i) =>
  page.drawText(text, {
    x: 48,
    y: 760 - i * 42,
    size: i === 0 ? 22 : 11,
    font,
    color: rgb(0.12, 0.15, 0.13),
  }),
);
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const examples = [];
for (const streams of [false, true]) {
  const id = streams ? 'compressed-objects' : 'uncompressed-objects';
  const filename = `compression-${id}.pdf`;
  const bytes = await document.save({ useObjectStreams: streams });
  const result = await processPdf('compress', [{ name: filename, type: 'application/pdf', bytes }]);
  const loaded = await PDFDocument.load(result.bytes);
  assert.equal(loaded.getPageCount(), 1);
  assert.deepEqual(loaded.getPage(0).getSize(), { width: 595.28, height: 841.89 });
  const task = getDocument({ data: new Uint8Array(result.bytes), useSystemFonts: true });
  try {
    const text = await (await (await task.promise).getPage(1)).getTextContent();
    const words = text.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    for (const line of lines) assert.ok(words.includes(line), `Missing output text: ${line}`);
  } finally {
    await task.destroy();
  }
  if (streams) {
    assert.ok(result.note, 'The already-compressed example should retain the original.');
    assert.deepEqual(result.bytes, bytes);
  } else {
    assert.ok(result.bytes.length < bytes.length, 'The uncompressed example should get smaller.');
  }
  await writeFile(new URL(filename, directory), bytes);
  examples.push({
    id,
    source: `/samples/${filename}`,
    sourceSha256: sha256(bytes),
    inputBytes: bytes.length,
    returnedBytes: result.bytes.length,
    originalReturned: Boolean(result.note),
  });
}
const evidence = {
  measuredAt: new Date().toISOString(),
  engineSha256: sha256(await readFile(new URL('../src/lib/pdf-engine.ts', import.meta.url))),
  method: 'Folio processPdf(compress); one A4 text page saved with and without object streams.',
  limitations:
    'Two synthetic files, not typical savings. Metadata and engine changes can alter byte counts.',
  verified: [
    'one page',
    'same page dimensions',
    'all five text lines',
    'original bytes retained when no saving',
  ],
  examples,
};
await writeFile(
  new URL('../src/lib/compression-example.json', import.meta.url),
  `${JSON.stringify(evidence, null, 2)}\n`,
);
console.log(JSON.stringify(evidence, null, 2));

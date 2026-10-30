import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  PDFDocument,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  setTextRenderingMode,
  TextRenderingMode,
} from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { processPdf, inspectPdf, exportEditor } from '../src/lib/pdf-engine';
import { processTextPdf } from './pdf-text-engine.mjs';
import { defaultTextChange } from '../src/lib/editor-text';
import type { TextInspection } from '../src/lib/pro-types';
import { newInvoice, invoiceTotals } from '../src/lib/invoice';
import { renderInvoicePdf } from '../src/lib/invoice-pdf';
import { createQrSvg } from '../src/lib/qr-code';

// Controlled fictional inputs, the production engines, and independent PDF.js
// checks. Run explicitly; customer data and external document services are unused.
const directory = new URL('../public/samples/tutorials/', import.meta.url);
await mkdir(directory, { recursive: true });
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const records: Record<string, { href: string; sha256: string; checks: string[] }> = {};
async function save(name: string, bytes: Uint8Array, checks: string[]) {
  await writeFile(new URL(name, directory), bytes);
  records[name] = { href: `/samples/tutorials/${name}`, sha256: sha(bytes), checks };
}
async function text(bytes: Uint8Array, password?: string) {
  const task = getDocument({ data: bytes.slice(), password, useSystemFonts: true });
  try {
    const pdf = await task.promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const content = await (await pdf.getPage(i)).getTextContent();
      pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
const input = async (name: string) => ({
  name,
  bytes: new Uint8Array(await readFile(new URL(`../public/samples/${name}`, import.meta.url))),
});
const packet = await input('page-selection-practice.pdf');
const portrait = await input('a4-portrait-practice.pdf');
const landscape = await input('letter-landscape-practice.pdf');
const noteState = (await inspectPdf(packet.bytes)).state;
noteState.annotations = [
  {
    id: 'budget-review',
    pageId: noteState.pages[2].id,
    kind: 'text',
    x: 48,
    y: 410,
    width: 440,
    height: 30,
    text: 'Please confirm the material quantities.',
    color: '#202522',
    size: 14,
    opacity: 1,
  },
];
const noted = await exportEditor(packet.bytes, noteState);
assert.ok((await text(noted))[2].includes('Please confirm the material quantities.'));
await save('budget-note.pdf', noted, [
  'Six-page packet retained',
  'New review note on Budget; existing words retained',
]);
const jpgInput = { ...(await input('practice-receipt.jpg')), type: 'image/jpeg' };
const pngInput = { ...(await input('practice-screenshot.png')), type: 'image/png' };
for (const [name, images, a4, expected] of [
  ['receipt-a4.pdf', [jpgInput], true, [{ width: 595.28, height: 841.89 }]],
  ['screenshot-fitted.pdf', [pngInput], false, [{ width: 750, height: 525 }]],
] as const) {
  const result = await processPdf('images', [...images], { a4 });
  assert.deepEqual(
    (await PDFDocument.load(result.bytes)).getPages().map((p) => p.getSize()),
    expected,
  );
  await save(name, result.bytes, [
    'One image per PDF page',
    a4 ? 'A4 portrait sheet with margins' : 'Fitted page; 750 × 525 points',
  ]);
}
const optimizeSource = await input('compression-uncompressed-objects.pdf');
const optimized = await processPdf('compress', [optimizeSource]);
assert.ok(optimized.bytes.length < optimizeSource.bytes.length);
await save('optimized-structure.pdf', optimized.bytes, [
  'Smaller than the uncompressed-object practice PDF',
  'One A4 page; original text remains selectable',
]);

const selected = await processPdf('extract', [packet], { pages: [5, 1, 2] });
assert.deepEqual(
  (await text(selected.bytes)).map((t) =>
    ['Appendix', 'Summary', 'Budget'].find((s) => t.includes(s)),
  ),
  ['Appendix', 'Summary', 'Budget'],
);
await save('selected-pages.pdf', selected.bytes, [
  'Three pages: Appendix, Summary, Budget',
  'Source file positions 6, 2, 3',
]);
await save(
  'summary-budget.txt',
  new TextEncoder().encode(
    (await text(packet.bytes))
      .slice(1, 3)
      .map((s, i) => `--- Page ${i + 2} ---\n${s}`)
      .join('\n\n'),
  ),
  ['Summary and Budget wording only', 'Reference extraction; no fonts, page layout, or OCR'],
);
await save('landscape-text.txt', new TextEncoder().encode((await text(landscape.bytes))[0]), [
  'Landscape appendix wording',
  'Plain text; page graphics and positions are not retained',
]);
const merged = await processPdf('merge', [portrait, landscape]);
assert.deepEqual(
  (await PDFDocument.load(merged.bytes)).getPages().map((p) => p.getSize()),
  [
    { width: 595.28, height: 841.89 },
    { width: 792, height: 612 },
  ],
);
await save('mixed-page-sizes.pdf', merged.bytes, [
  'Two pages',
  'A4 portrait then US Letter landscape; sizes unchanged',
]);
const combined = await processPdf('merge', [
  { name: 'selection.pdf', bytes: selected.bytes },
  landscape,
]);
assert.equal((await PDFDocument.load(combined.bytes)).getPageCount(), 4);
await save('four-page-packet.pdf', combined.bytes, [
  'Appendix, Summary, Budget, Landscape appendix',
  'Four pages',
]);

const rotation = await processPdf('rotate', [await input('rotation-practice.pdf')], {
  pages: [1],
  rotation: 90,
});
assert.deepEqual(
  (await PDFDocument.load(rotation.bytes)).getPages().map((p) => p.getRotation().angle),
  [0, 0, 0],
);
await save('rotation-corrected.pdf', rotation.bytes, [
  'Three upright pages',
  'Only source position 2 rotated clockwise 90 degrees',
]);
const crop = await processPdf('crop', [portrait], { margin: 20 });
assert.deepEqual((await PDFDocument.load(crop.bytes)).getPage(0).getCropBox(), {
  x: 20,
  y: 20,
  width: 555.28,
  height: 801.89,
});
await save('cropped-margins.pdf', crop.bytes, [
  'Visible area 555.28 × 801.89 points',
  'CropBox only; not redaction',
]);
const watermark = await processPdf('watermark', [packet], {
  pages: [1, 2, 3, 4, 5],
  text: 'DRAFT',
  size: 48,
  opacity: 0.18,
  color: '#202522',
});
const marked = await text(watermark.bytes);
assert.ok(!marked[0].includes('DRAFT'));
assert.ok(marked.slice(1).every((t) => t.includes('DRAFT')));
await save('watermarked-packet.pdf', watermark.bytes, [
  'Six pages; cover unchanged',
  'DRAFT on positions 2–6',
]);
const numbering = await processPdf('numbers', [await input('numbering-practice.pdf')], {
  pages: [1, 2, 3, 4, 5],
  start: 1,
});
const numberedText = await text(numbering.bytes);
for (let i = 1; i < 6; i++) assert.ok(numberedText[i].trim().endsWith(String(i)));
await save('numbered-after-cover.pdf', numbering.bytes, [
  'Cover unchanged',
  'Content footers 1 through 5',
]);
const organizedState = (await inspectPdf(packet.bytes)).state;
organizedState.pages = [0, 1, 2, 5, 3].map((i) => organizedState.pages[i]);
const organized = await exportEditor(packet.bytes, organizedState);
assert.equal((await PDFDocument.load(organized)).getPageCount(), 5);
assert.ok((await text(organized))[3].includes('Appendix'));
assert.ok(!(await text(organized)).some((t) => t.includes('Receipt B')));
await save('organized-packet.pdf', organized, [
  'Five pages: Cover, Summary, Budget, Appendix, Receipt A',
  'Receipt B excluded',
]);

const source = await PDFDocument.create();
source.setTitle('Fictional workshop wording practice');
const font = await source.embedFont(StandardFonts.Helvetica);
for (let i = 0; i < 3; i++) {
  const page = source.addPage([595.28, 841.89]);
  page.drawText('FICTIONAL WORKSHOP / PRACTICE ONLY', { x: 48, y: 785, size: 12, font });
  page.drawText(`Workshop sheet ${i + 1}`, { x: 48, y: 735, size: 22, font });
  page.drawText('Venue: Room 4', { x: 48, y: 660, size: 18, font });
  if (i === 2) page.drawText('Archive: Room 40', { x: 48, y: 600, size: 18, font });
  page.drawText('No real appointment or booking.', { x: 48, y: 70, size: 11, font });
}
const wording = await source.save();
await save('wording-source.pdf', wording, [
  'Three Venue: Room 4 occurrences',
  'One Archive: Room 40 occurrence that should remain unchanged',
]);
const inspection = (await processTextPdf(wording, { operation: 'inspect' })) as TextInspection;
const changes = inspection.blocks
  .filter((b) => b.text.includes('Venue: Room 4'))
  .map((b) => ({
    ...defaultTextChange(b),
    text: b.text.replace('Venue: Room 4', 'Venue: Room 7'),
  }));
assert.equal(changes.length, 3);
const replaced = (await processTextPdf(wording, { operation: 'edit', changes })) as Uint8Array;
const replacedText = (await text(replaced)).join(' ');
assert.equal(replacedText.match(/Venue: Room 7/g)?.length, 3);
assert.ok(replacedText.includes('Archive: Room 40'));
await save('wording-replaced.pdf', replaced, [
  'Three Venue: Room 7 occurrences',
  'Archive: Room 40 retained',
  'No paragraph reflow',
]);
const single = (await processTextPdf(wording, {
  operation: 'edit',
  changes: [changes[0]],
})) as Uint8Array;
assert.equal((await text(single)).join(' ').match(/Venue: Room 7/g)?.length, 1);
await save('wording-one-correction.pdf', single, [
  'Only page 1 corrected',
  'Venue: Room 4 remains on pages 2 and 3',
]);
const reviewState = (await inspectPdf(wording)).state;
reviewState.annotations = [
  {
    id: 'review-comment',
    pageId: reviewState.pages[1].id,
    kind: 'comment',
    x: 48,
    y: 210,
    width: 28,
    height: 28,
    text: 'Please confirm whether this venue should change to Room 7. Keep the archive reference on page 3.',
    color: '#202522',
    size: 12,
    opacity: 1,
  },
];
const review = await exportEditor(wording, reviewState);
assert.deepEqual(await text(review), await text(wording));
assert.equal((await PDFDocument.load(review)).getPage(1).node.Annots()?.size(), 1);
await save('review-with-comment.pdf', review, [
  'Original wording unchanged on all three pages',
  'One PDF comment attached on page 2; requires a comment-capable reader',
]);
await save(
  'translation-review-worksheet.csv',
  new TextEncoder().encode(
    'page,source_phrase,target_language,target_phrase,numbers_checked,review_decision\n1,Venue: Room 4,,,,\n2,Venue: Room 4,,,,\n3,Venue: Room 4,,,,\n3,Archive: Room 40,,,,\n',
  ),
  [
    'Four source phrases to review against the wording practice PDF',
    'Target and decision columns intentionally blank; no translation is performed',
  ],
);

const scanImage = await sharp(
  Buffer.from(
    '<svg width="1000" height="260" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="white"/><text x="50" y="130" font-family="sans-serif" font-size="50">Practice phrase: Orchard 42</text></svg>',
  ),
)
  .png()
  .toBuffer();
const diagnostic = await PDFDocument.create();
const diagnosticFont = await diagnostic.embedFont(StandardFonts.Helvetica);
const scan = await diagnostic.embedPng(scanImage);
for (let i = 0; i < 3; i++) {
  const page = diagnostic.addPage([595.28, 841.89]);
  if (i === 0)
    page.drawText('Practice phrase: Orchard 42', { x: 48, y: 660, size: 22, font: diagnosticFont });
  else page.drawImage(scan, { x: 24, y: 550, width: 547, height: 142.22 });
  if (i === 2) {
    page.pushOperators(pushGraphicsState(), setTextRenderingMode(TextRenderingMode.Invisible));
    page.drawText('Practice phrase: Orchard 42', { x: 48, y: 660, size: 22, font: diagnosticFont });
    page.pushOperators(popGraphicsState());
  }
}
const diagnosticBytes = await diagnostic.save();
const diagnosticText = await text(diagnosticBytes);
assert.ok(diagnosticText[0].includes('Orchard 42'));
assert.equal(diagnosticText[1].trim(), '');
assert.ok(diagnosticText[2].includes('Orchard 42'));
await save('text-layer-diagnostic.pdf', diagnosticBytes, [
  'Page 1: visible selectable text',
  'Page 2: image only, no extracted words',
  'Page 3: image plus invisible text; selection is not proof the visible letters can be rewritten',
]);

const form = await PDFDocument.create();
const formFont = await form.embedFont(StandardFonts.Helvetica);
const formPage = form.addPage([595.28, 841.89]);
formPage.drawText('FICTIONAL WORKSHOP RESPONSE', { x: 48, y: 770, size: 22, font: formFont });
formPage.drawText('Participant name', { x: 48, y: 690, size: 13, font: formFont });
formPage.drawText('Receive workshop notes', { x: 78, y: 592, size: 13, font: formFont });
formPage.drawText('Signature (practice only)', { x: 48, y: 450, size: 13, font: formFont });
formPage.drawText('Not a contract, booking, or identity verification.', {
  x: 48,
  y: 70,
  size: 11,
  font: formFont,
});
const blankForm = await form.save();
await save('workshop-blank.pdf', blankForm, [
  'No interactive form fields',
  'Fictional workshop labels and blank response areas',
]);
const builder = (await inspectPdf(blankForm)).state;
builder.annotations = [
  {
    id: 'name-field',
    pageId: builder.pages[0].id,
    kind: 'field',
    x: 48,
    y: 168.89,
    width: 300,
    height: 28,
    text: 'participant_name',
    color: '#202522',
    size: 12,
    opacity: 1,
  },
  {
    id: 'notes-field',
    pageId: builder.pages[0].id,
    kind: 'checkbox',
    x: 48,
    y: 235.89,
    width: 18,
    height: 18,
    text: 'receive_notes',
    color: '#202522',
    size: 12,
    opacity: 1,
  },
];
const master = await exportEditor(blankForm, builder, false);
await save('workshop-form-master.pdf', master, [
  'Blank participant_name and receive_notes fields',
  'One page; no personal data',
]);
const formState = (await inspectPdf(master)).state;
formState.formValues = { participant_name: 'Sam Example', receive_notes: true };
const fillable = await exportEditor(master, formState, false);
const flattened = await exportEditor(master, formState, true);
assert.equal(
  (await PDFDocument.load(fillable)).getForm().getTextField('participant_name').getText(),
  'Sam Example',
);
assert.equal((await PDFDocument.load(flattened)).getForm().getFields().length, 0);
assert.ok((await text(flattened))[0].includes('Sam Example'));
await save('workshop-form-filled.pdf', fillable, [
  'Sam Example; receive_notes checked',
  'Fields remain editable',
]);
await save('workshop-form-flattened.pdf', flattened, [
  'Sam Example retained visibly',
  'Zero interactive form fields',
]);
formState.annotations = [
  {
    id: 'demo-signature',
    pageId: formState.pages[0].id,
    kind: 'signature',
    x: 48,
    y: 410,
    width: 240,
    height: 50,
    text: 'Sam Example',
    font: 'Times-Italic',
    size: 28,
    color: '#202522',
    opacity: 1,
    signatureSource: 'type',
  },
];
const signed = await exportEditor(master, formState, true);
assert.ok((await text(signed))[0].includes('Sam Example'));
await save('workshop-signed-copy.pdf', signed, [
  'Fictional Sam Example visual signature',
  'Completed flattened response',
  'No digital certificate or identity verification',
]);

const password = 'Practice-only-42';
const protectedPdf = (await processTextPdf(portrait.bytes, {
  operation: 'protect',
  password,
})) as Uint8Array;
await assert.rejects(text(protectedPdf), /password/i);
assert.ok((await text(protectedPdf, password))[0].includes('Portrait report'));
await save('password-practice.pdf', protectedPdf, [
  'Requires the public demonstration password Practice-only-42',
  'Password opens the original one-page report',
  'Contains no confidential information',
]);

const invoice = newInvoice('2026-10-31');
invoice.from.name = 'Example Design Studio';
invoice.to.name = 'Fictional Client';
invoice.number = 'PRACTICE-001';
invoice.items = [
  {
    id: 'hours',
    description: 'Layout work (fictional)',
    quantity: '3',
    rate: '50',
    taxable: false,
  },
  {
    id: 'fixed',
    description: 'File preparation (fictional)',
    quantity: '1',
    rate: '25',
    taxable: false,
  },
];
invoice.paid = '50';
invoice.notes = 'Fictional arithmetic exercise. Not a real invoice. No payment is requested.';
assert.equal(invoiceTotals(invoice).balance, 12500);
const invoicePdf = await renderInvoicePdf(invoice, {
  regular: new Uint8Array(await readFile('public/fonts/pdf/LiberationSans-Regular.ttf')),
  bold: new Uint8Array(await readFile('public/fonts/pdf/LiberationSans-Bold.ttf')),
});
await save('invoice-with-deposit.pdf', invoicePdf.bytes, [
  'USD subtotal 175.00',
  'Deposit 50.00; balance 125.00',
  'No tax assumption for real transactions',
]);
await save(
  'invoice-draft.json',
  new TextEncoder().encode(`${JSON.stringify(invoice, null, 2)}\n`),
  ['Importable fictional invoice draft', 'Same line items and paid amount as PDF'],
);

const destination = 'https://thebestfreepdf.com/samples/a4-portrait-practice.pdf';
const qr = await createQrSvg(
  {
    kind: 'url',
    value: destination,
    network: '',
    password: '',
    encryption: 'nopass',
    hidden: false,
  },
  '#202522',
  '#ffffff',
);
const qrPng = await sharp(Buffer.from(qr)).png().toBuffer();
const decoded = await sharp(qrPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
assert.equal(
  jsQR(new Uint8ClampedArray(decoded.data), decoded.info.width, decoded.info.height)?.data,
  destination,
);
await save('practice-pdf-qr.svg', new TextEncoder().encode(qr), [
  'Decoded payload is the direct public practice-PDF URL',
  'Four-module quiet zone',
]);
await save('practice-pdf-qr.png', qrPng, ['Decoded payload matches SVG', '1024 × 1024 pixels']);

const previous = JSON.parse(
  await readFile(new URL('../src/lib/tutorial-evidence.json', import.meta.url), 'utf8').catch(
    () => '{}',
  ),
);
await writeFile(
  new URL('../src/lib/tutorial-evidence.json', import.meta.url),
  JSON.stringify(
    {
      ...previous,
      checkedAt: new Date().toISOString(),
      method:
        'Actual Folio PDF/text/invoice/QR engines; PDF.js extraction, pdf-lib inspection, and QR decoding. Fictional practice data only.',
      engineSha256: sha(await readFile('src/lib/pdf-engine.ts')),
      files: { ...previous.files, ...records },
    },
    null,
    2,
  ) + '\n',
);
console.log(`Generated and checked ${Object.keys(records).length} tutorial artifacts.`);

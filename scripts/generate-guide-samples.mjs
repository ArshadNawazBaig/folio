import { mkdir, writeFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Original, fictional documents for the public guides. No customer data or remote assets.
const directory = new URL('../public/samples/', import.meta.url);
await mkdir(directory, { recursive: true });
const ink = rgb(0.125, 0.145, 0.133);
const muted = rgb(0.38, 0.43, 0.35);
const sage = rgb(0.91, 0.94, 0.87);

async function sample(filename, title, pages) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setAuthor('Folio');
  pdf.setSubject('Fictional sample for the Folio PDF guides');
  pdf.setCreator('Folio');
  pdf.setCreationDate(new Date('2026-09-26T00:00:00Z'));
  pdf.setModificationDate(new Date('2026-09-26T00:00:00Z'));
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (const [index, specification] of pages.entries()) {
    const page = pdf.addPage(specification.size);
    const [width, height] = specification.size;
    page.drawRectangle({ x: 36, y: height - 112, width: width - 72, height: 76, color: sage });
    const line = (text, x, y, size = 12, font = regular, color = ink) =>
      page.drawText(text, { x, y, size, font, color });
    line('FOLIO / PRACTICE DOCUMENT', 52, height - 62, 10, bold, muted);
    line(specification.heading, 52, height - 94, 25, bold);
    line(`File position: ${index + 1} of ${pages.length}`, 48, height - 159, 18, bold);
    line(`Printed page label: ${specification.label}`, 48, height - 187);
    line(
      specification.dimensions || 'A4 portrait / 210 x 297 mm',
      48,
      height - 213,
      12,
      regular,
      muted,
    );
    for (const [row, text] of specification.lines.entries()) {
      line(text, 48, height - 265 - row * 24);
    }
    page.drawLine({ start: { x: 48, y: 70 }, end: { x: width - 48, y: 70 }, color: sage });
    line(
      'Original fictional sample. Free to use for learning and testing.',
      48,
      51,
      10,
      regular,
      muted,
    );
    line('thebestfreepdf.com/guides', 48, 36, 10, regular, muted);
    line(specification.label, width - 75, 40, 12, bold);
  }
  await writeFile(new URL(filename, directory), await pdf.save());
  console.log(`${filename}: ${pages.length} page(s)`);
}

const a4 = [595.28, 841.89];
await sample('page-selection-practice.pdf', 'PDF page selection practice', [
  {
    size: a4,
    heading: 'Project packet / cover',
    label: 'Cover',
    lines: [
      'This cover is file position 1, but has no printed page number.',
      'Try selecting 6, 2-3 to put the appendix first.',
    ],
  },
  {
    size: a4,
    heading: 'Summary',
    label: '1',
    lines: [
      'This is file position 2 and printed page 1.',
      'Project: Example studio refresh',
      'Status: Draft for practice only',
    ],
  },
  {
    size: a4,
    heading: 'Budget',
    label: '2',
    lines: [
      'This is file position 3 and printed page 2.',
      'Materials: 120 example units',
      'Assembly: 80 example units',
      'Total: 200 example units',
    ],
  },
  {
    size: a4,
    heading: 'Receipt A',
    label: '3',
    lines: [
      'This is file position 4 and printed page 3.',
      'Fictional receipt for materials. Not a tax document.',
    ],
  },
  {
    size: a4,
    heading: 'Receipt B',
    label: '4',
    lines: [
      'This is file position 5 and printed page 4.',
      'Fictional receipt for assembly. Not a tax document.',
    ],
  },
  {
    size: a4,
    heading: 'Appendix',
    label: '5',
    lines: [
      'This is file position 6 and printed page 5.',
      'Expected result for 6, 2-3: Appendix, Summary, Budget.',
      'Repeated selections are included only once.',
    ],
  },
]);
await sample('a4-portrait-practice.pdf', 'A4 portrait merge practice', [
  {
    size: a4,
    heading: 'Portrait report',
    label: '1',
    lines: [
      'Merge this document first, followed by the landscape sample.',
      'Expected output: this A4 portrait page followed by a wider page.',
      'Merging should preserve both original page dimensions.',
    ],
  },
]);
await sample('letter-landscape-practice.pdf', 'US Letter landscape merge practice', [
  {
    size: [792, 612],
    heading: 'Landscape appendix',
    label: '1',
    dimensions: 'US Letter landscape / 11 x 8.5 inches',
    lines: [
      'Place this after the A4 portrait sample in Merge PDF.',
      'Expected dimensions: 792 x 612 PDF points.',
      'A wider page in the result is expected; the content has not been stretched.',
    ],
  },
]);

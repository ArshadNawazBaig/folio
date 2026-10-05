import { mkdir, writeFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import sharp from 'sharp';

// Original fictional practice assets; no customer data, purchased assets or external requests.
// Run manually with node scripts/generate-tool-samples.mjs; outputs are committed in public/.
const directory = new URL('../public/samples/', import.meta.url);
await mkdir(directory, { recursive: true });
const ink = rgb(0.125, 0.145, 0.133);
const sage = rgb(0.91, 0.94, 0.87);
async function pdfSample(filename, title, headings, rotationPage = -1) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setAuthor('Folio');
  pdf.setSubject('Original fictional practice file. Free to use and share.');
  pdf.setCreationDate(new Date('2026-10-05T00:00:00Z'));
  pdf.setModificationDate(new Date('2026-10-05T00:00:00Z'));
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  headings.forEach((heading, index) => {
    const page = pdf.addPage([595.28, 841.89]);
    page.drawRectangle({ x: 36, y: 722, width: 523.28, height: 84, color: sage });
    const line = (text, y, size = 13, font = regular) =>
      page.drawText(text, { x: 52, y, size, font, color: ink });
    line('FOLIO / PRACTICE DOCUMENT', 780, 10, bold);
    line(heading, 747, 26, bold);
    line('Original fictional document for learning and testing.', 680);
    line('Free to use, modify and share. No real customer information.', 655);
    if (rotationPage >= 0) {
      line('TOP OF PAGE - this heading should read upright.', 600, 15, bold);
      line('In Rotate PDF, select the second page and rotate clockwise 90 degrees.', 565, 11);
      if (index === rotationPage) page.setRotation(degrees(270));
    } else {
      line('This file has no printed page numbers.', 600, 15, bold);
      line('In Add page numbers, select pages 2-6 and start at 1.', 565);
      line('The cover should stay unchanged. The content pages should show 1-5.', 540, 11);
      line('The lower margin is intentionally empty for your page numbers.', 490);
    }
    line('thebestfreepdf.com', 88, 10);
  });
  await writeFile(new URL(filename, directory), await pdf.save());
}

await pdfSample(
  'rotation-practice.pdf',
  'Practice rotating a sideways page',
  ['Cover', 'Sideways page', 'Closing notes'],
  1,
);
await pdfSample('numbering-practice.pdf', 'Practice numbering pages after a cover', [
  'Cover',
  'Summary',
  'Budget',
  'Schedule',
  'Notes',
  'Appendix',
]);

const receipt = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
  <rect width="1200" height="900" fill="#eef1e8"/>
  <rect x="140" y="55" width="920" height="790" rx="16" fill="white"/>
  <rect x="140" y="55" width="920" height="150" rx="16" fill="#293c32"/>
  <g font-family="sans-serif" fill="#202522">
    <text x="195" y="115" font-size="22" fill="#dce8c7">FOLIO / FICTIONAL PRACTICE RECEIPT</text>
    <text x="195" y="170" font-size="38" fill="white">Example Studio Supplies</text>
    <text x="195" y="270" font-size="24">Use this image to try compression and conversion.</text>
    <text x="195" y="340" font-size="22">ITEM</text><text x="830" y="340" font-size="22">AMOUNT</text>
    <path d="M195 365H1000 M195 575H1000" stroke="#d4d9cf" stroke-width="3"/>
    <text x="195" y="420" font-size="30">Paper samples</text><text x="870" y="420" font-size="30">12.00</text>
    <text x="195" y="490" font-size="30">Color swatches</text><text x="886" y="490" font-size="30">8.00</text>
    <text x="195" y="640" font-size="34" font-weight="bold">Example total</text><text x="860" y="640" font-size="34" font-weight="bold">20.00</text>
    <text x="195" y="725" font-size="21">Not a tax document. No transaction took place.</text>
    <text x="195" y="765" font-size="21">Original sample. Free to use, modify and share.</text>
  </g></svg>`;
const screenshot = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700">
  <rect width="1000" height="700" fill="#f7f7f4"/>
  <rect width="1000" height="86" fill="#293c32"/>
  <g font-family="sans-serif" fill="#202522">
    <text x="45" y="53" font-size="25" fill="white">FOLIO / PRACTICE SCREENSHOT</text>
    <text x="45" y="153" font-size="34" font-weight="bold">A simple document workflow</text>
    <text x="45" y="200" font-size="21">Fictional interface for testing image-to-PDF conversion.</text>
    <rect x="45" y="245" width="910" height="270" rx="14" fill="white" stroke="#d4d9cf"/>
    <circle cx="98" cy="305" r="19" fill="#dfe9cc"/>
    <text x="139" y="313" font-size="24">Choose your source files</text>
    <circle cx="98" cy="383" r="19" fill="#dfe9cc"/>
    <text x="139" y="391" font-size="24">Arrange the reading order</text>
    <circle cx="98" cy="461" r="19" fill="#dfe9cc"/>
    <text x="139" y="469" font-size="24">Download and inspect the result</text>
    <text x="45" y="590" font-size="21">Check these letters at 100% zoom after converting: Aa Bb 0123456789</text>
    <text x="45" y="641" font-size="19">Original sample. Free to use, modify and share. No real account data.</text>
  </g></svg>`;
const transparent = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">
  <circle cx="150" cy="180" r="100" fill="#dfe9cc"/>
  <rect x="220" y="100" width="345" height="180" rx="30" fill="#293c32"/>
  <g font-family="sans-serif" fill="white">
    <text x="252" y="163" font-size="25">TRANSPARENT WEBP</text>
    <text x="252" y="210" font-size="20">The empty area has alpha.</text>
    <text x="252" y="244" font-size="18">JPG makes it white.</text>
  </g>
  <text x="64" y="350" font-family="sans-serif" font-size="18" fill="#202522">Folio practice graphic / free to use and share</text>
  </svg>`;
for (const [filename, svg, format, options] of [
  ['practice-receipt.jpg', receipt, 'jpeg', { quality: 94 }],
  ['practice-screenshot.png', screenshot, 'png', {}],
  ['practice-transparent.webp', transparent, 'webp', { lossless: true }],
]) {
  await writeFile(
    new URL(filename, directory),
    await sharp(Buffer.from(svg)).toFormat(format, options).toBuffer(),
  );
}
console.log('Created two practice PDFs and three practice images in public/samples.');

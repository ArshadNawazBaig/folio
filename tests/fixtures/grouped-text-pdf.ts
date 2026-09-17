import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function groupedTextPdf({ repeated = false, deep = false } = {}) {
  const source = await PDFDocument.create();
  const font = await source.embedFont(StandardFonts.HelveticaBold);
  const body = source.addPage([400, 240]);
  body.drawRectangle({ x: 0, y: 0, width: 400, height: 240, color: rgb(0.95, 0.97, 0.94) });
  let x = 24;
  for (const letter of 'Grouped heading') {
    body.drawText(letter, { x, y: 180, font, size: 24, color: rgb(0.4, 0.2, 0.7) });
    x += font.widthOfTextAtSize(letter, 24);
  }
  body.drawText('Unchanged supporting line', { x: 24, y: 120, font, size: 14 });
  const line = await PDFDocument.create();
  const lineFont = await line.embedFont(StandardFonts.Helvetica);
  const linePage = line.addPage([380, 40]);
  x = 0;
  for (const letter of 'Nested job title') {
    linePage.drawText(letter, { x, y: 10, font: lineFont, size: 18 });
    x += lineFont.widthOfTextAtSize(letter, 18);
  }
  const [title] = await source.embedPdf(await line.save());
  body.drawPage(title, { x: 24, y: 50 });
  const document = await PDFDocument.create();
  const [form] = await document.embedPdf(await source.save());
  const page = document.addPage([600, 800]);
  page.drawPage(form, { x: 50, y: 430, xScale: 1.2, yScale: 1.2 });
  if (repeated) page.drawPage(form, { x: 50, y: 70 });
  if (!deep) return new Uint8Array(await document.save());
  const outer = await PDFDocument.create();
  const [inner] = await outer.embedPdf(await document.save());
  outer.addPage([620, 840]).drawPage(inner, { x: 10, y: 20 });
  return new Uint8Array(await outer.save());
}

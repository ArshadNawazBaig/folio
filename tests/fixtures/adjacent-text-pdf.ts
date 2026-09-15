import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function adjacentTextPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([600, 400]);
  // PDFium infers a trailing space after the label from the neighboring value,
  // even though no space is encoded in the original label's text object.
  page.drawText('PROFILE NAME', { x: 50, y: 300, size: 12, font, color: rgb(0.4, 0.2, 0.7) });
  page.drawText('@[your-username]', { x: 250, y: 300, size: 12, font });
  page.drawText('Another editable section', { x: 50, y: 200, size: 12, font });
  return pdf.save();
}

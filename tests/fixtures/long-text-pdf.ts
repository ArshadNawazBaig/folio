import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function createLongTextPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([300, 2400]);
  page.drawText('Long receipt', { x: 24, y: 2340, size: 18, font });
  for (let row = 0; row < 24; row++)
    page.drawText(`Item ${row + 1}: Clear small text stays readable`, {
      x: 24,
      y: 2260 - row * 90,
      size: 8,
      font,
    });
  // Solid bands make clipping and tile boundaries measurable without OCR.
  page.drawRectangle({ x: 0, y: 1510, width: 300, height: 32, color: rgb(0, 0.5, 0) });
  page.drawText('End of receipt', { x: 24, y: 36, size: 10, font });
  for (let i = 0; i < 12; i++) {
    const next = pdf.addPage([595, 842]);
    next.drawText(`Supporting page ${i + 1}`, { x: 40, y: 780, size: 14, font });
  }
  return pdf.save();
}

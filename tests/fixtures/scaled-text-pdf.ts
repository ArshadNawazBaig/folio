import {
  PDFDocument,
  StandardFonts,
  beginText,
  endText,
  setFontAndSize,
  setTextMatrix,
  showText,
} from 'pdf-lib';

// Real PDF operators, including the 1 Tf + scaled Tm pattern used by receipts.
// No private customer document or mocked text inspection is required.
export async function createScaledTextPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([300, 500]);
  const fontName = page.node.newFontDictionary('Receipt', font.ref);
  for (const [label, size, scale, y] of [
    ['Receipt total', 1, 14, 440],
    ['Item quantity', 0.5, 24, 400],
    ['Reference number', 200, 0.05, 360],
  ] as const)
    page.pushOperators(
      beginText(),
      setFontAndSize(fontName, size),
      setTextMatrix(scale, 0, 0, scale, 36, y),
      showText(font.encodeText(label)),
      endText(),
    );
  page.drawText('Keep this receipt', { x: 36, y: 60, size: 10, font });
  return pdf.save();
}

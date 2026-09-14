import { readFile } from 'node:fs/promises';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export async function createEmbeddedFontPdf(subset = false) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const page = pdf.addPage([500, 500]);
  for (const [index, style] of ['Regular', 'Italic', 'BoldItalic'].entries()) {
    const font = await pdf.embedFont(
      await readFile(
        new URL(
          `../../node_modules/pdfjs-dist/standard_fonts/LiberationSans-${style}.ttf`,
          import.meta.url,
        ),
      ),
      { subset },
    );
    page.drawText(`Original ${style} receipt`, {
      x: 40,
      y: 400 - index * 100,
      size: 18,
      font,
      color: rgb(0.2, 0.3, 0.4),
      opacity: 0.8,
    });
  }
  return pdf.save();
}

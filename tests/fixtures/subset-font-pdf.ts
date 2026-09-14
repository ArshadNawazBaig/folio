import { readFile } from 'node:fs/promises';
import { PDFDocument, degrees } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export async function createSubsetFontPdf(
  category: 'Sans' | 'Serif' | 'Mono',
  style = 'Regular',
  rotation = 0,
) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(
    await readFile(
      new URL(`../../public/fonts/pdf/Liberation${category}-${style}.ttf`, import.meta.url),
    ),
    {
      subset: true,
      customName: `Customer${category}-${style}`,
    },
  );
  const page = pdf.addPage([500, 500]);
  page.setRotation(degrees(rotation));
  page.drawText('Original receipt', { x: 50, y: 300, size: 20, font });
  return pdf.save();
}

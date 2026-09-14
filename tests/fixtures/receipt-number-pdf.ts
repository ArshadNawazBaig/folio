import { readFile } from 'node:fs/promises';
import { PDFDocument, PDFName, PDFDict, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export async function createReceiptNumberPdf(kind: 'standard' | 'unmapped' | 'geist' = 'standard') {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font =
    kind === 'standard'
      ? await pdf.embedFont(StandardFonts.CourierBold)
      : await pdf.embedFont(
          await readFile(
            new URL(
              kind === 'geist'
                ? '../../public/fonts/pdf/GeistMono-SemiBold.ttf'
                : '../../node_modules/pdfjs-dist/standard_fonts/LiberationSans-Bold.ttf',
              import.meta.url,
            ),
          ),
          { subset: kind === 'geist' },
        );
  const page = pdf.addPage([300, 300]);
  page.drawText('000002', { x: 40, y: 200, size: 24, font });
  if (kind === 'unmapped') {
    await pdf.flush();
    const mapping = ` /CIDInit /ProcSet findresource begin 12 dict begin begincmap
      /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
      /CMapName /Receipt def /CMapType 2 def
      1 begincodespacerange <0000> <FFFF> endcodespacerange
      2 beginbfchar ${font.encodeText('0')} <0030> ${font.encodeText('2')} <0032> endbfchar
      endcmap CMapName currentdict /CMap defineresource pop end end`;
    pdf.context
      .lookup(font.ref, PDFDict)
      .set(PDFName.of('ToUnicode'), pdf.context.register(pdf.context.flateStream(mapping)));
  }
  return pdf.save();
}

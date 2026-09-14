import { PDFDocument, PDFDict, PDFName, StandardFonts } from 'pdf-lib';

// Some receipt fonts expose an internal control code through ToUnicode even
// though their existing PDF glyph paints correctly. This is synthetic data.
export async function createEncodedReceiptPdf() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.CourierBold);
  const page = pdf.addPage([400, 400]);
  page.drawText('00002', { x: 50, y: 300, size: 20, font });
  page.drawText('Receipt total', { x: 50, y: 220, size: 16, font });
  await pdf.flush();
  const entries = Array.from({ length: 95 }, (_, index) => {
    const code = index + 32;
    return `<${code.toString(16).padStart(2, '0')}> <${(code === 50 ? 2 : code).toString(16).padStart(4, '0')}>`;
  });
  const mapping = `/CIDInit /ProcSet findresource begin 12 dict begin begincmap
    /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
    /CMapName /EncodedReceipt def /CMapType 2 def
    1 begincodespacerange <00> <FF> endcodespacerange
    95 beginbfchar ${entries.join('\n')} endbfchar
    endcmap CMapName currentdict /CMap defineresource pop end end`;
  pdf.context
    .lookup(font.ref, PDFDict)
    .set(PDFName.of('ToUnicode'), pdf.context.register(pdf.context.flateStream(mapping)));
  return pdf.save();
}

import {
  PDFDocument,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  lineTo,
  appendBezierCurve,
  closePath,
  clip,
  endPath,
  rectangle,
} from 'pdf-lib';

export async function clippedTextPdf(pageWidth = 600) {
  const pdf = await PDFDocument.create();
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([pageWidth, 900]);
  page.drawRectangle({ x: 0, y: 0, width: 600, height: 900, color: rgb(0.93, 0.97, 0.94) });
  page.drawText('Visible document heading', { x: 40, y: 840, font: bold, size: 24 });
  // Rounded card clipping, as emitted by browsers when printing overflow:hidden.
  page.pushOperators(
    pushGraphicsState(),
    moveTo(56, 400),
    lineTo(274, 400),
    appendBezierCurve(282.8, 400, 290, 407.2, 290, 416),
    lineTo(290, 744),
    appendBezierCurve(290, 752.8, 282.8, 760, 274, 760),
    lineTo(56, 760),
    appendBezierCurve(47.2, 760, 40, 752.8, 40, 744),
    lineTo(40, 416),
    appendBezierCurve(40, 407.2, 47.2, 400, 56, 400),
    closePath(),
    clip(),
    endPath(),
  );
  page.drawRectangle({ x: 40, y: 400, width: 250, height: 360, color: rgb(0.97, 0.98, 0.99) });
  page.drawText('Card title', {
    x: 64,
    y: 720,
    size: 20,
    font: bold,
    color: rgb(124 / 255, 58 / 255, 237 / 255),
  });
  page.pushOperators(pushGraphicsState(), rectangle(64, 645, 220, 50), clip(), endPath());
  page.drawText('Visible card description', {
    x: 64,
    y: 672,
    size: 14,
    font: regular,
    color: rgb(0.32, 0.4, 0.5),
  });
  page.drawText('Second visible line', { x: 64, y: 650, size: 14, font: regular });
  page.drawText('Hidden overflow must stay hidden', { x: 64, y: 615, size: 14, font: regular });
  page.pushOperators(popGraphicsState());
  page.drawText('Partially masked word', { x: 270, y: 590, size: 14, font: regular });
  page.pushOperators(popGraphicsState());
  page.pushOperators(pushGraphicsState(), rectangle(330, 200, 230, 300), clip(), endPath());
  page.drawText('Another section', { x: 350, y: 430, size: 18, font: bold });
  page.drawText('Visible account details', { x: 350, y: 400, size: 14, font: regular });
  page.pushOperators(popGraphicsState());
  return new Uint8Array(await pdf.save());
}

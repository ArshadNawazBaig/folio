import {
  PDFDocument,
  PDFName,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  drawObject,
} from 'pdf-lib';

export async function paintedTextPdf(gradient = false, fontData?: Uint8Array) {
  const pdf = await PDFDocument.create();
  if (fontData) pdf.registerFontkit((await import('@pdf-lib/fontkit')).default);
  const font = await pdf.embedFont(
    fontData || StandardFonts.HelveticaBold,
    fontData ? { subset: true, customName: 'CustomerSans-Bold' } : {},
  );
  const page = pdf.addPage([500, 6000]);
  page.drawRectangle({ x: 0, y: 0, width: 500, height: 6000, color: rgb(0.95, 0.97, 0.94) });
  page.drawText('Ordinary purple', {
    x: 40,
    y: 5920,
    size: 22,
    font,
    color: rgb(124 / 255, 58 / 255, 237 / 255),
  });
  const bounds = [40, 5750, 160, 5800];
  const mask = pdf.context.register(
    pdf.context.flateStream(
      `q 1 g BT /F 40 Tf 1 0 0 1 40 5755 Tm ${font.encodeText('scale')} Tj ET Q`,
      {
        Type: 'XObject',
        Subtype: 'Form',
        BBox: bounds,
        Resources: { Font: { F: font.ref } },
        Group: { S: 'Transparency', CS: 'DeviceGray' },
      },
    ),
  );
  const shades = Array.from({ length: 33 }, (_, i) =>
    gradient
      ? [124 / 255 + ((40 / 255) * i) / 32, 58 / 255, 237 / 255]
      : [124 / 255, 58 / 255, 237 / 255],
  );
  const fn = pdf.context.register(
    pdf.context.flateStream(
      new Uint8Array(shades.flatMap((row) => row.map((v) => Math.round(v * 255)))),
      { FunctionType: 0, BitsPerSample: 8, Size: [33], Domain: [0, 1], Range: [0, 1, 0, 1, 0, 1] },
    ),
  );
  const shade = pdf.context.register(
    pdf.context.obj({
      ShadingType: 2,
      ColorSpace: 'DeviceRGB',
      Coords: [40, 5750, 160, 5800],
      Extend: [true, true],
      Function: fn,
    }),
  );
  const graphic = pdf.context.register(
    pdf.context.flateStream('q 40 5750 120 50 re W n /GS gs /Shade sh Q', {
      Type: 'XObject',
      Subtype: 'Form',
      BBox: bounds,
      Resources: {
        Shading: { Shade: shade },
        ExtGState: { GS: { SMask: { S: 'Luminosity', G: mask } } },
      },
    }),
  );
  page.node.setXObject(PDFName.of('PaintedWord'), graphic);
  page.pushOperators(pushGraphicsState(), drawObject('PaintedWord'), popGraphicsState());
  page.drawText('scale', { x: 40, y: 5755, size: 40, font, opacity: 0 });
  page.drawText('Hidden OCR', { x: 40, y: 5600, size: 20, font, opacity: 0 });
  page.drawText('Far away content', { x: 40, y: 100, size: 20, font });
  return new Uint8Array(await pdf.save());
}

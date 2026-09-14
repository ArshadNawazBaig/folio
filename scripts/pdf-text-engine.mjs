import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { init } from '@embedpdf/pdfium';
import { processTextPdf as process } from '../src/lib/pdf-text-engine.mjs';
import { loadDocumentFont } from '../src/lib/server/document-fonts.mjs';

let instance;
const platform = {
  allowExport: true,
  async engine() {
    instance ??= init({
      wasmBinary: await readFile(new URL(import.meta.resolve('@embedpdf/pdfium/pdfium.wasm'))),
      print: () => {},
      printErr: () => {},
    }).then((api) => {
      api.PDFiumExt_Init();
      return api;
    });
    return instance;
  },
  passwordSeed: () => randomBytes(32).toString('hex'),
  loadFont: (face) =>
    face.google
      ? loadDocumentFont(face.name)
      : readFile(new URL(`../public${face.url}`, import.meta.url)),
  async encodeRgba(rgba, width, height) {
    const { default: sharp } = await import('sharp');
    return (
      await sharp(Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength), {
        raw: { width, height, channels: 4 },
      })
        .png({ compressionLevel: 3, adaptiveFiltering: false })
        .toBuffer()
    ).toString('base64');
  },
};
export function processTextPdf(bytes, job) {
  return process(bytes, job, platform);
}

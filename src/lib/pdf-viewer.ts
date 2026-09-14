import type { PDFDocumentProxy } from 'pdfjs-dist';
let library: Promise<typeof import('pdfjs-dist')> | undefined;
export async function loadViewer(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  library ??= import('pdfjs-dist');
  const pdfjs = await library;
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  return pdfjs.getDocument({
    data: bytes.slice(),
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    wasmUrl: '/pdfjs/wasm/',
  }).promise;
}

import { init } from '@embedpdf/pdfium';
import { processTextPdf } from '../lib/pdf-text-engine.mjs';
import { documentFontUrl } from '../lib/document-fonts.mjs';

const engine = (async () => {
  if (typeof OffscreenCanvas === 'undefined') throw new Error('Browser previews are unavailable.');
  const response = await fetch('/pdfium/pdfium.wasm');
  if (!response.ok) throw new Error('The preview engine could not be loaded.');
  const api = await init({
    wasmBinary: await response.arrayBuffer(),
    print: () => {},
    printErr: () => {},
  });
  api.PDFiumExt_Init();
  return api;
})();
void engine.then(
  () => self.postMessage({ ready: true }),
  () => self.postMessage({ unavailable: true }),
);
const platform = {
  allowExport: false,
  engine: () => engine,
  async loadFont(face: { google?: boolean; name: string; url?: string }) {
    const response = await fetch(face.google ? documentFontUrl(face.name) : face.url!, {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error('The replacement font could not be loaded.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) throw new Error('The replacement font is too large.');
    return bytes;
  },
  async encodeRgba(rgba: Uint8Array, width: number, height: number) {
    const canvas = new OffscreenCanvas(width, height);
    try {
      const context = canvas.getContext('2d');
      if (!context) throw new Error('The preview canvas is unavailable.');
      context.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 32768)
        binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      return btoa(binary);
    } finally {
      canvas.width = canvas.height = 1;
    }
  },
};
let source: Uint8Array | null = null;
let pending: { id: number; job: object } | null = null;
let running = false;
async function work() {
  if (running) return;
  running = true;
  try {
    while (pending) {
      const request = pending;
      pending = null;
      try {
        if (!source) throw new Error('The document is unavailable.');
        const result = await processTextPdf(source, request.job, platform);
        self.postMessage({ id: request.id, result });
      } catch (error) {
        self.postMessage({
          id: request.id,
          error: error instanceof Error ? error.message : 'This page could not be previewed.',
        });
      }
    }
  } finally {
    running = false;
  }
}
self.onmessage = (event) => {
  const message = event.data;
  if (message.type === 'source') {
    // One worker belongs to one opened document; never replace its source mid-job.
    if (!source && message.bytes instanceof Uint8Array && message.bytes.length <= 10 * 1024 * 1024)
      source = message.bytes;
  } else if (message.type === 'cancel') {
    if (pending?.id === message.id) pending = null;
  } else if (message.type === 'preview') {
    if (message.job?.operation !== 'preview') {
      self.postMessage({
        id: message.id,
        error: 'Use the download action to export a finished PDF.',
      });
      return;
    }
    if (pending) self.postMessage({ id: pending.id, error: 'Preview superseded.' });
    pending = { id: message.id, job: message.job };
    void work();
  }
};

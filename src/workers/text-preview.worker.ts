import { init } from '@embedpdf/pdfium';
import { processTextPdf } from '../lib/pdf-text-engine.mjs';
import { documentFontUrl } from '../lib/document-fonts.mjs';
import type { InteractiveTextImage, TextInspection } from '../lib/pro-types';
import { retryTransientRequest } from '../lib/request-retry';
import { browserAsset } from '../lib/pdfium-asset.json';

const engine = (async () => {
  if (typeof OffscreenCanvas === 'undefined') throw new Error('Browser previews are unavailable.');
  const wasmBinary = await retryTransientRequest(async () => {
    const response = await fetch(browserAsset);
    if (!response.ok)
      throw Object.assign(new Error('The preview engine could not be loaded.'), {
        status: response.status,
      });
    return response.arrayBuffer();
  });
  const api = await init({
    wasmBinary,
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
  transferPixels: true,
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
type WorkerJob = { operation: 'inspect'; page: number } | { operation: 'preview' };
let pending: { id: number; job: WorkerJob; background?: boolean } | null = null;
const inspections = new Map<number, TextInspection>();
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
        const result =
          (request.job.operation === 'inspect' && inspections.get(request.job.page)) ||
          ((await processTextPdf(source, request.job, platform)) as
            InteractiveTextImage | TextInspection);
        if (request.job.operation === 'inspect') {
          inspections.set(request.job.page, result as TextInspection);
          if (inspections.size > 4) inspections.delete(inspections.keys().next().value!);
        }
        const transfer =
          'pixels' in result ? result.pixels.map((tile) => tile.data.buffer as ArrayBuffer) : [];
        self.postMessage({ id: request.id, result }, { transfer });
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
  } else if (message.type === 'job') {
    if (
      message.job?.operation !== 'preview' &&
      !(
        message.job?.operation === 'inspect' &&
        Number.isInteger(message.job.page) &&
        message.job.page >= 0 &&
        message.job.page < 100
      )
    ) {
      self.postMessage({
        id: message.id,
        error: 'Use the download action to export a finished PDF.',
      });
      return;
    }
    if (message.background && pending && !pending.background) {
      self.postMessage({ id: message.id, error: 'Preview superseded.' });
      return;
    }
    if (pending) self.postMessage({ id: pending.id, error: 'Preview superseded.' });
    pending = { id: message.id, job: message.job, background: message.background };
    void work();
  }
};

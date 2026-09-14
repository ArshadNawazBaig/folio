import type { PdfInput, PdfOperation, PdfOptions, PdfOutput } from './types';
import type { inspectPdf } from './pdf-engine';
export function runPdf(
  operation: 'inspect',
  inputs: PdfInput[],
  options?: PdfOptions,
  signal?: AbortSignal,
): Promise<Awaited<ReturnType<typeof inspectPdf>>>;
export function runPdf(
  operation: PdfOperation,
  inputs: PdfInput[],
  options?: PdfOptions,
  signal?: AbortSignal,
): Promise<PdfOutput>;
export function runPdf(
  operation: PdfOperation | 'inspect',
  inputs: PdfInput[],
  options: PdfOptions = {},
  signal?: AbortSignal,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/pdf.worker.ts', import.meta.url));
    const cleanup = () => {
      worker.terminate();
      signal?.removeEventListener('abort', abort);
      clearTimeout(timer);
    };
    const abort = () => {
      cleanup();
      reject(new Error('Processing cancelled. Your original files are unchanged.'));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error('This document took too long to process. Try fewer pages or a smaller file.'),
      );
    }, 180_000);
    worker.onmessage = (event) => {
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.result);
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error('The PDF worker could not start. Reload the page and try again.'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) {
      abort();
      return;
    }
    worker.postMessage({ id: crypto.randomUUID(), operation, inputs, options });
  });
}

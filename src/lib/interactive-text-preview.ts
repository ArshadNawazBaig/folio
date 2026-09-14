'use client';
import { requestTextPdf } from './editor-text-client';
import type { TextPreview } from './pro-types';

export class InteractiveTextPreview {
  private worker: Worker;
  private ready: Promise<void>;
  private rejectReady!: (error: Error) => void;
  private sequence = 0;
  private stopped = false;
  private warmTimer: ReturnType<typeof setTimeout> | undefined;
  private pending = new Map<
    number,
    { resolve: (result: TextPreview) => void; reject: (error: Error) => void }
  >();
  constructor(bytes: Uint8Array) {
    this.worker = new Worker(new URL('../workers/text-preview.worker.ts', import.meta.url), {
      name: 'folio-text-preview',
    });
    this.ready = new Promise((resolve, reject) => {
      this.rejectReady = reject;
      this.warmTimer = setTimeout(() => this.dispose(), 20000);
      this.worker.onmessage = ({ data }) => {
        if (data.ready) {
          clearTimeout(this.warmTimer);
          resolve();
        } else if (data.unavailable) {
          this.dispose();
        } else if (data.id) {
          const request = this.pending.get(data.id);
          if (data.error) request?.reject(new Error(data.error));
          else request?.resolve(data.result);
        }
      };
      this.worker.onerror = () => this.dispose();
    });
    // Prewarming can fail before the first selection; the server remains available.
    void this.ready.catch(() => {});
    const copy = bytes.slice();
    this.worker.postMessage({ type: 'source', bytes: copy }, [copy.buffer]);
  }
  render(job: object, signal: AbortSignal): Promise<TextPreview> {
    if (this.stopped || signal.aborted)
      return Promise.reject(new Error('Browser preview unavailable.'));
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const finish = (error?: Error, result?: TextPreview) => {
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
        this.pending.delete(id);
        if (error) reject(error);
        else resolve(result!);
      };
      const abort = () => {
        this.worker.postMessage({ type: 'cancel', id });
        finish(new DOMException('Preview cancelled.', 'AbortError'));
      };
      const timeout = setTimeout(() => {
        finish(new Error('The browser preview took too long.'));
        this.dispose();
      }, 20000);
      this.pending.set(id, {
        resolve: (result) => finish(undefined, result),
        reject: (error) => finish(error),
      });
      signal.addEventListener('abort', abort, { once: true });
      void this.ready.then(
        () => {
          if (this.pending.has(id)) this.worker.postMessage({ type: 'preview', id, job });
        },
        (error) => finish(error),
      );
    });
  }
  dispose() {
    if (this.stopped) return;
    this.stopped = true;
    clearTimeout(this.warmTimer);
    this.worker.terminate();
    const error = new Error('Browser preview unavailable.');
    this.rejectReady(error);
    for (const request of [...this.pending.values()]) request.reject(error);
    this.pending.clear();
  }
}

export async function interactiveTextPreview(
  client: InteractiveTextPreview | null,
  bytes: Uint8Array,
  name: string,
  job: object,
  signal: AbortSignal,
): Promise<TextPreview> {
  if (!client) return (await requestTextPdf(bytes, name, job, false, signal)).json();
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) controller.abort();
  let startFallback!: () => void;
  const fallbackReady = new Promise<void>((resolve) => {
    startFallback = resolve;
  });
  const timer = setTimeout(startFallback, 350);
  const browser = client.render(job, controller.signal).catch((error) => {
    startFallback();
    throw error;
  });
  const server = fallbackReady.then(async () => {
    if (controller.signal.aborted) throw new DOMException('Preview cancelled.', 'AbortError');
    return (
      await requestTextPdf(bytes, name, job, false, controller.signal)
    ).json() as Promise<TextPreview>;
  });
  try {
    return await Promise.any([browser, server]);
  } catch (error) {
    throw error instanceof AggregateError ? error.errors[1] : error;
  } finally {
    clearTimeout(timer);
    controller.abort();
    startFallback();
    signal.removeEventListener('abort', abort);
  }
}

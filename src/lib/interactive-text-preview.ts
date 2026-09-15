'use client';
import { requestTextPdf } from './editor-text-client';
import type { InteractiveTextImage, TextInspection } from './pro-types';
import { trimPreviews } from './text-preview-cache';

type WorkerResult = InteractiveTextImage | TextInspection;

export class InteractiveTextPreview {
  private worker: Worker;
  private ready: Promise<void>;
  private rejectReady!: (error: Error) => void;
  private sequence = 0;
  private stopped = false;
  private warmTimer: ReturnType<typeof setTimeout> | undefined;
  private images = new Map<string, InteractiveTextImage>();
  private warming: {
    key: string;
    controller: AbortController;
    promise: Promise<InteractiveTextImage>;
  } | null = null;
  private pending = new Map<
    number,
    { resolve: (result: WorkerResult) => void; reject: (error: Error) => void }
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
  private request<T extends WorkerResult>(
    job: object,
    signal: AbortSignal,
    background = false,
  ): Promise<T> {
    if (this.stopped || signal.aborted)
      return Promise.reject(new Error('Browser preview unavailable.'));
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const finish = (error?: Error, result?: WorkerResult) => {
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
        this.pending.delete(id);
        if (error) reject(error);
        else resolve(result as T);
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
          if (this.pending.has(id)) this.worker.postMessage({ type: 'job', id, job, background });
        },
        (error) => finish(error),
      );
    });
  }
  inspect(page: number, signal: AbortSignal) {
    this.cancelPrefetch();
    return this.request<TextInspection>({ operation: 'inspect', page }, signal);
  }
  private retain(key: string, image: InteractiveTextImage) {
    this.images.delete(key);
    this.images.set(key, image);
    trimPreviews(this.images, (value) => value);
    return image;
  }
  render(job: object, signal: AbortSignal): Promise<InteractiveTextImage> {
    if (signal.aborted) return Promise.reject(new DOMException('Preview cancelled.', 'AbortError'));
    const key = JSON.stringify(job);
    const image = this.images.get(key);
    if (image) return Promise.resolve(this.retain(key, image));
    if (this.warming?.key === key) {
      const promise = this.warming.promise;
      return new Promise((resolve, reject) => {
        const abort = () => reject(new DOMException('Preview cancelled.', 'AbortError'));
        signal.addEventListener('abort', abort, { once: true });
        void promise
          .then(resolve, reject)
          .finally(() => signal.removeEventListener('abort', abort));
      });
    }
    this.cancelPrefetch();
    return this.request<InteractiveTextImage>(job, signal).then((image) => this.retain(key, image));
  }
  prefetch(job: object) {
    if (this.stopped) return;
    const key = JSON.stringify(job);
    if (this.images.has(key) || this.warming?.key === key) return;
    this.cancelPrefetch();
    const controller = new AbortController();
    const promise = this.request<InteractiveTextImage>(job, controller.signal, true).then((image) =>
      this.retain(key, image),
    );
    this.warming = { key, controller, promise };
    // Speculation never shows errors or starts a server request.
    void promise
      .catch(() => {})
      .finally(() => {
        if (this.warming?.promise === promise) this.warming = null;
      });
  }
  cancelPrefetch() {
    this.warming?.controller.abort();
    this.warming = null;
  }
  dispose() {
    if (this.stopped) return;
    this.stopped = true;
    this.cancelPrefetch();
    this.images.clear();
    clearTimeout(this.warmTimer);
    this.worker.terminate();
    const error = new Error('Browser preview unavailable.');
    this.rejectReady(error);
    for (const request of [...this.pending.values()]) request.reject(error);
    this.pending.clear();
  }
}

async function browserOrServer<T>(
  client: InteractiveTextPreview | null,
  bytes: Uint8Array,
  name: string,
  job: object,
  signal: AbortSignal,
  run: (client: InteractiveTextPreview, signal: AbortSignal) => Promise<T>,
): Promise<T> {
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
  const browser = run(client, controller.signal).catch((error) => {
    startFallback();
    throw error;
  });
  const server = fallbackReady.then(async () => {
    if (controller.signal.aborted) throw new DOMException('Preview cancelled.', 'AbortError');
    return (await requestTextPdf(bytes, name, job, false, controller.signal)).json() as Promise<T>;
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

export function interactiveTextPreview(
  client: InteractiveTextPreview | null,
  bytes: Uint8Array,
  name: string,
  job: object,
  signal: AbortSignal,
) {
  return browserOrServer(client, bytes, name, job, signal, (client, signal) =>
    client.render(job, signal),
  );
}

export function inspectInteractiveText(
  client: InteractiveTextPreview | null,
  bytes: Uint8Array,
  name: string,
  page: number,
  signal: AbortSignal,
) {
  return browserOrServer(
    client,
    bytes,
    name,
    { operation: 'inspect', page },
    signal,
    (client, signal) => client.inspect(page, signal),
  );
}

import type { Page } from '@playwright/test';

export type PreviewDiagnostics = {
  ready?: boolean;
  jobs: { id: number; operation: string; page: number; background: boolean }[];
  results: { id: number; bytes: number; inspection: boolean }[];
};
declare global {
  interface Window {
    previewDiagnostics?: PreviewDiagnostics;
  }
}

export async function disableBrowserTextPreview(page: Page) {
  await page.addInitScript(() => {
    window.previewDiagnostics = { jobs: [], results: [] };
    window.Worker = new Proxy(window.Worker, {
      construct(target, args) {
        if (args[1]?.name === 'folio-text-preview') throw new Error('Browser preview unavailable.');
        return Reflect.construct(target, args);
      },
    });
  });
}

export async function observeBrowserTextPreview(page: Page) {
  await page.addInitScript(() => {
    window.previewDiagnostics = { jobs: [], results: [] };
    window.Worker = new Proxy(window.Worker, {
      construct(target, args) {
        const worker = Reflect.construct(target, args) as Worker;
        if (args[1]?.name === 'folio-text-preview') {
          const post = worker.postMessage.bind(worker);
          worker.postMessage = (
            data,
            transfer: Transferable[] | StructuredSerializeOptions = [],
          ) => {
            if (data?.type === 'job')
              window.previewDiagnostics!.jobs.push({
                id: data.id,
                operation: data.job.operation,
                page: data.job.page,
                background: !!data.background,
              });
            post(data, Array.isArray(transfer) ? transfer : transfer.transfer || []);
          };
          worker.addEventListener('message', ({ data }) => {
            if (data.ready) {
              (window as Window & { textPreviewReady?: boolean }).textPreviewReady = true;
              window.previewDiagnostics!.ready = true;
            }
            if (data.result)
              window.previewDiagnostics!.results.push({
                id: data.id,
                bytes:
                  data.result.pixels?.reduce(
                    (sum: number, tile: { data: Uint8Array }) => sum + tile.data.byteLength,
                    0,
                  ) || 0,
                inspection: !!data.result.blocks,
              });
          });
        }
        return worker;
      },
    });
  });
}

export async function useBrowserTextPreviewOnly(page: Page) {
  await observeBrowserTextPreview(page);
  await page.route('**/api/pro/preview', async (route) => {
    if (route.request().postDataBuffer()?.toString().includes('"operation":"preview"'))
      await route.abort();
    else await route.continue();
  });
}

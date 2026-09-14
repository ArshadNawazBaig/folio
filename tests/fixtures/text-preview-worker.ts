import type { Page } from '@playwright/test';

export async function disableBrowserTextPreview(page: Page) {
  await page.addInitScript(() => {
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
    window.Worker = new Proxy(window.Worker, {
      construct(target, args) {
        const worker = Reflect.construct(target, args) as Worker;
        if (args[1]?.name === 'folio-text-preview')
          worker.addEventListener('message', ({ data }) => {
            if (data.ready)
              (window as Window & { textPreviewReady?: boolean }).textPreviewReady = true;
          });
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

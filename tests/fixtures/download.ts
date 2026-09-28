import { readFile } from 'node:fs/promises';
import { expect, type Locator, type Page } from '@playwright/test';

export async function watchDownloads(page: Page) {
  await page.addInitScript(() => {
    Object.assign(window, { preparedDownloads: [] });
    window.addEventListener('folio:download-ready', (event) => {
      const { blob, name } = (event as CustomEvent<{ blob: Blob; name: string }>).detail;
      (window as unknown as { preparedDownloads: unknown[] }).preparedDownloads.push({
        name,
        type: blob.type,
        size: blob.size,
      });
    });
    // Model browsers that reject a synthetic download after async processing.
    document.addEventListener(
      'click',
      (event) => {
        if (
          matchMedia('(any-pointer: coarse), (max-width: 760px)').matches &&
          !event.isTrusted &&
          event.target instanceof Element &&
          event.target.closest('a[download]')
        )
          event.preventDefault();
      },
      true,
    );
  });
}

export async function saveDownload(page: Page, button: string | Locator, type: string) {
  const mobile = await page.evaluate(
    () => matchMedia('(any-pointer: coarse), (max-width: 760px)').matches,
  );
  const pending = page.waitForEvent('download');
  await (
    typeof button === 'string' ? page.getByRole('button', { name: button, exact: true }) : button
  ).click();
  const ready = page.getByRole('dialog', { name: 'Your file is ready.' });
  if (mobile) {
    await expect(ready).toBeVisible();
    const link = ready.getByRole('link', { name: 'Download file', exact: true });
    await expect(link).toBeInViewport();
    expect(
      await link.evaluate(
        async (element: HTMLAnchorElement) => (await (await fetch(element.href)).blob()).type,
      ),
    ).toBe(type.split(';')[0]);
    if (type.startsWith('image/'))
      await expect(ready.getByRole('link', { name: 'open the image' })).toBeVisible();
    else if (type === 'application/zip' || type.startsWith('text/'))
      await expect(ready.getByRole('link', { name: /open the/ })).toHaveCount(0);
    await link.click();
  }
  const file = await pending;
  expect(await file.failure()).toBeNull();
  const bytes = await readFile((await file.path())!);
  const name = file.suggestedFilename();
  expect(
    await page.evaluate(() =>
      (window as unknown as { preparedDownloads: unknown[] }).preparedDownloads.at(-1),
    ),
  ).toEqual({ name, type, size: bytes.length });
  expect(bytes.length).toBeGreaterThan(0);
  if (mobile) await ready.getByRole('button', { name: 'Close download options' }).click();
  return { bytes, name };
}

import { readFile } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures/editor-storage';

test('an asynchronously exported PDF can be saved with its edits and the editor stays open', async ({
  page,
  isMobile,
}) => {
  // Model slow processing so the original tap has expired before export finishes.
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      private operation = '';
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        Object.defineProperty(this, 'onmessage', {
          set: (handler: (event: MessageEvent) => void) => {
            this.addEventListener('message', (event) => {
              setTimeout(() => handler.call(this, event), this.operation === 'edit' ? 6000 : 0);
            });
          },
        });
      }
      postMessage(message: { operation: string }) {
        this.operation = message.operation;
        super.postMessage(message);
      }
    };
    // A download must follow a real tap on mobile, not a synthetic async click.
    document.addEventListener(
      'click',
      (event) => {
        const link = event.target instanceof Element ? event.target.closest('a[download]') : null;
        if (link && matchMedia('(pointer: coarse)').matches && !event.isTrusted)
          event.preventDefault();
      },
      true,
    );
  });
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  const added = page.getByRole('textbox', { name: 'Edit added text', exact: true });
  await added.fill('Saved from my phone');
  // Download directly while typing, so the latest inline edit must be committed too.
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const ready = page.getByRole('dialog', { name: 'Your file is ready.' });
  if (isMobile) {
    await expect(ready).toBeVisible();
    await expect(ready).toContainText('Studio North — Proposal-edited.pdf');
    expect((await new AxeBuilder({ page }).include('dialog[open]').analyze()).violations).toEqual(
      [],
    );
    await expect(ready.getByRole('link', { name: 'Download file', exact: true })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `/tmp/folio-download-${test.info().project.name}.png` });
    await ready.getByRole('link', { name: 'Download file', exact: true }).click();
  } else await expect(ready).toBeHidden();
  const file = await downloaded;
  expect(file.suggestedFilename()).toBe('Studio North — Proposal-edited.pdf');
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(await readFile((await file.path())!)) });
  try {
    const text = await (await (await task.promise).getPage(1)).getTextContent();
    expect(text.items.map((item) => ('str' in item ? item.str : '')).join(' ')).toContain(
      'Saved from my phone',
    );
  } finally {
    await task.destroy();
  }
  if (isMobile) await ready.getByRole('button', { name: 'Close download options' }).click();
  await expect(page).toHaveURL(/\/workspace\?cloud=/);
  await expect(page.locator('.annotation-text')).toContainText('Saved from my phone');
  await expect(page.getByRole('dialog', { name: 'Are you sure you want to leave?' })).toBeHidden();
  await expect(page.locator('.download-gate')).toBeHidden();
});

test('canceling or failing native sharing retains the file and its download fallback', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'The native share dialog is offered on mobile.');
  await page.addInitScript(() => {
    let attempt = 0;
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: ({ files }: ShareData) => {
        if (!navigator.userActivation.isActive) throw new Error('Missing fresh user activation');
        if (!files?.[0] || files[0].type !== 'application/pdf') throw new Error('Missing PDF');
        attempt++;
        if (attempt === 1) return Promise.reject(new DOMException('Canceled', 'AbortError'));
        if (attempt === 2)
          return Promise.reject(new DOMException('Not allowed', 'NotAllowedError'));
        return Promise.resolve();
      },
    });
  });
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const ready = page.getByRole('dialog', { name: 'Your file is ready.' });
  const share = ready.getByRole('button', { name: 'Share file' });
  await share.click();
  await expect(ready.getByRole('status')).toContainText('Sharing was canceled');
  await expect(ready.getByRole('alert')).toHaveCount(0);
  await share.click();
  await expect(ready.getByRole('alert')).toContainText('Use Download file instead');
  await share.click();
  await expect(ready.getByRole('status')).toContainText('handed to your selected app');
  // The same prepared bytes remain available without processing again.
  const download = page.waitForEvent('download');
  await ready.getByRole('link', { name: 'Download file', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('Studio North — Proposal-edited.pdf');
  await expect(page).toHaveURL(/\/workspace\?cloud=/);
});

test('file export failures show the actual error without a ready or success message', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const send = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message) {
      if (message.operation === 'edit') {
        this.dispatchEvent(new MessageEvent('message', { data: { error: 'Export test failure' } }));
      } else send.call(this, message);
    };
  });
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect(page.getByText('Export test failure', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Your file is ready.' })).toBeHidden();
  await expect(page.getByText('Your edited PDF has been downloaded.', { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeEnabled();
});

test('mobile original-text downloads still require premium access', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Desktop premium access has its own regression coverage.');
  let paidRequests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/pro/pdf')) paidRequests++;
  });
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  const text = page.getByRole('textbox', { name: 'Edit original text: A place to', exact: true });
  await text.fill('A changed title');
  await text.press('Enter');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const gate = page.locator('.download-gate');
  await expect(gate).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Your file is ready.' })).toBeHidden();
  expect(paidRequests).toBe(0);
  await gate.getByRole('button', { name: 'Keep editing', exact: true }).last().click();
  await expect(page).toHaveURL(/\/workspace\?cloud=/);
});

import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';

test('advertising is absent on public, private, filtered, translated, and missing pages', async ({
  request,
}) => {
  for (const path of [
    '/',
    '/edit-pdf',
    '/blog',
    '/blog?q=no-matching-article-adsense-audit',
    '/guides/how-to-add-text-to-a-pdf',
    '/privacy',
    '/account',
    '/workspace',
    '/invoice-editor',
    '/dashboard',
    '/support',
    '/folio-adsense-regression-missing',
    '/fr/privacy',
    '/de/dashboard',
  ]) {
    const response = await request.get(path);
    expect([200, 404], path).toContain(response.status());
    const html = await response.text();
    expect(html, path).not.toMatch(
      /<script\b[^>]*src=["'][^"']*(?:adsbygoogle|googlesyndication|fundingchoices)/i,
    );
    expect(html, path).not.toMatch(/<ins\b[^>]*class=["'][^"']*adsbygoogle/i);
  }
});

test('privacy disclosures and worked examples remain readable on mobile without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  try {
    for (const path of [
      '/privacy',
      '/fr/privacy',
      '/ja/privacy',
      '/guides/how-to-add-text-to-a-pdf',
      '/guides/how-to-combine-images-into-pdf',
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      await expect(page.locator('main h1')).toHaveCount(1);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        path,
      ).toBe(true);
      if (path.endsWith('/privacy')) {
        await expect(page.locator('main a[href="https://myadcenter.google.com/"]')).toBeVisible();
        await expect(
          page.locator('main a[href="https://policies.google.com/technologies/partner-sites"]'),
        ).toBeVisible();
      } else {
        const resultLinks = await page
          .locator('main a[href$="worked-result.pdf"]')
          .evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
        expect(resultLinks.length, path).toBeGreaterThan(0);
        for (const href of resultLinks) {
          const sample = await context.request.get(href);
          expect(sample.status(), href).toBe(200);
          expect(sample.headers()['content-type']).toContain('application/pdf');
          expect((await sample.body()).subarray(0, 5).toString()).toBe('%PDF-');
        }
      }
    }
  } finally {
    await context.close();
  }
});

test('the image guide exercise works through the real browser controls', async ({ page }) => {
  await page.goto('/image-to-pdf');
  await page
    .locator('input[type="file"]')
    .setInputFiles([
      'public/samples/practice-receipt.jpg',
      'public/samples/practice-screenshot.png',
    ]);
  for (const fitted of [false, true]) {
    if (fitted) {
      await page.getByRole('combobox', { name: 'Page size', exact: true }).click();
      await page.getByRole('option', { name: 'Fit each image', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
    const pending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    const download = await pending;
    expect(await download.failure()).toBeNull();
    const pdf = await PDFDocument.load(await readFile((await download.path())!));
    expect(pdf.getPages().map((p) => p.getSize())).toEqual(
      fitted
        ? [
            { width: 900, height: 675 },
            { width: 750, height: 525 },
          ]
        : [
            { width: 595.28, height: 841.89 },
            { width: 595.28, height: 841.89 },
          ],
    );
  }
});

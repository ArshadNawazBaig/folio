import { test, expect } from './fixtures/editor-storage';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { locales } from '../src/lib/i18n/config';
import type { Page } from '@playwright/test';

async function messages(locale: string): Promise<Record<string, string>> {
  const [features, site, common, dashboard] = await Promise.all([
    readFile(`src/lib/i18n/feature-messages/${locale}.json`, 'utf8'),
    readFile(`src/lib/i18n/site-messages/${locale}.json`, 'utf8'),
    readFile(`src/lib/i18n/messages/${locale}.json`, 'utf8'),
    readFile(`src/lib/i18n/dashboard-messages/${locale}.json`, 'utf8'),
  ]);
  return {
    ...JSON.parse(features),
    ...JSON.parse(site),
    ...JSON.parse(common).ui,
    ...JSON.parse(dashboard),
  };
}
const pages = [
  ['/pricing', 'Start with the essentials.'],
  ['/invoice-generator', 'Invoice generator'],
  ['/compress-images', 'Image compressor'],
  ['/url-shortener', 'URL shortener'],
  ['/create-qr-code', 'Create QR code'],
  ['/forms', 'to get it in writing.'],
  ['/convert', 'Convert PDFs and images.'],
  ['/guides', 'Practical PDF guides.'],
  ['/about', 'between the big ideas.'],
  ['/privacy', 'YOUR DOCUMENTS. YOUR BUSINESS.'],
  ['/terms', 'using Folio.'],
  ['/security', 'security issue.'],
  ['/support', 'right when you need it.'],
  ['/account', 'YOUR FOLIO ACCOUNT'],
];
for (const locale of locales.filter((l) => l !== 'en')) {
  test(`${locale} translates remaining public pages on the server`, async ({ browser }) => {
    test.setTimeout(120_000);
    const copy = await messages(locale);
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
      for (const [path, key] of pages) {
        const response = await page.goto(`/${locale}${path}`);
        expect(response?.status(), path).toBe(200);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('main')).toContainText(copy[key]);
        expect(copy[key], key).toBeTruthy();
        expect(copy[key], key).not.toBe(key);
      }
    } finally {
      await context.close();
    }
  });
}

async function untranslatedText(page: Page, copy: Record<string, string>) {
  const keys = Object.keys(copy).filter(
    (k) => k.trim().length > 3 && copy[k] !== k && /[A-Za-z]/.test(k),
  );
  return page.locator('main').evaluate((main, keys) => {
    const english = new Set(keys.map((k) => k.replace(/\s+/g, ' ').trim()));
    const matches = new Set<string>();
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest('script,style,[translate="no"]') || !parent.checkVisibility())
        continue;
      const value = node.textContent?.replace(/\s+/g, ' ').trim();
      if (value && english.has(value)) matches.add(value);
    }
    for (const input of main.querySelectorAll('[placeholder],[aria-label]')) {
      if (!input.checkVisibility()) continue;
      for (const attr of ['placeholder', 'aria-label']) {
        const value = input.getAttribute(attr)?.replace(/\s+/g, ' ').trim();
        if (value && english.has(value)) matches.add(value);
      }
    }
    return [...matches];
  }, keys);
}

test('German page bodies and controls do not fall back to known English copy', async ({ page }) => {
  test.setTimeout(120_000);
  const copy = await messages('de');
  const failures: Record<string, string[]> = {};
  for (const path of [
    '/pricing',
    '/invoice-generator',
    '/compress-images',
    '/url-shortener',
    '/create-qr-code',
    '/forms',
    '/convert',
    '/guides',
    '/about',
    '/privacy',
    '/terms',
    '/security',
    '/support',
    '/account',
    '/guides/how-to-merge-and-split-pdfs',
    '/signature-generator',
    '/protect-pdf',
  ]) {
    await page.goto(`/de${path}`);
    await expect(page.locator('header summary').first()).toContainText('DE');
    const left = await untranslatedText(page, copy);
    if (left.length) failures[path] = left;
  }
  await page.goto('/workspace');
  await expect(page.locator('h1')).toContainText(copy['Your finishing touches.']);
  failures['/workspace'] = await untranslatedText(page, copy);
  await page.goto('/workspace?sample=proposal');
  await expect(page.getByRole('textbox', { name: copy['Document name'] })).toBeVisible();
  await expect(page.locator('.canvas-instruction')).toBeVisible();
  failures['/workspace loaded'] = await untranslatedText(page, copy);
  await page.goto('/invoice-editor');
  await expect(page.locator('h1').first()).toHaveText(copy['Invoice editor']);
  failures['/invoice-editor'] = await untranslatedText(page, copy);
  for (const tab of ['Items', 'Payment & notes', 'Design']) {
    await page
      .getByRole('navigation', { name: copy['Invoice sections'] })
      .getByRole('button', { name: copy[tab] })
      .click();
    failures[`/invoice-editor ${tab}`] = await untranslatedText(page, copy);
  }
  expect(Object.fromEntries(Object.entries(failures).filter(([, v]) => v.length))).toEqual({});
});

test('expanded translated pages retain English layout and fit mobile screens', async ({
  browser,
  page,
}) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await context.newPage();
  async function structure() {
    return staticPage
      .locator('main')
      .evaluate((main) =>
        [...main.querySelectorAll('*')]
          .filter((el) => !['SCRIPT', 'STYLE'].includes(el.tagName))
          .map((el) => [el.tagName, el.className]),
      );
  }
  try {
    for (const path of [
      '/pricing',
      '/forms',
      '/about',
      '/guides/how-to-merge-and-split-pdfs',
      '/compress-images',
    ]) {
      await staticPage.goto(path);
      const english = await structure();
      await staticPage.goto(`/de${path}`);
      expect(await structure(), path).toEqual(english);
    }
  } finally {
    await context.close();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const locale of ['de', 'ja']) {
    for (const path of ['/pricing', '/forms', '/account', '/compress-images']) {
      await page.goto(`/${locale}${path}`);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${locale}${path}`,
      ).toBe(true);
    }
  }
});

test('translated tool settings remain translated after loading a document', async ({ page }) => {
  const copy = await messages('de');
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const buffer = Buffer.from(await pdf.save());
  for (const path of ['/watermark-pdf', '/page-numbers', '/crop-pdf']) {
    await page.goto(`/de${path}`);
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: copy['Choose a file'], exact: true }).click();
    await (await chooser).setFiles({ name: 'settings.pdf', mimeType: 'application/pdf', buffer });
    await expect(page.locator('.file-row')).toContainText('settings.pdf');
    expect(await untranslatedText(page, copy), path).toEqual([]);
  }
});

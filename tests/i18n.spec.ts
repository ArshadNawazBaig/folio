import { test, expect } from './fixtures/editor-storage';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { tools } from '../src/lib/tools';
import {
  locales,
  languagePath,
  translatedPaths,
  translatedToolSlugs,
} from '../src/lib/i18n/config';

// Compare actual rendered structure and design tokens; translated wording may wrap differently.
async function pageDesign(page: Page) {
  return page.evaluate(() => ({
    structure: [...document.querySelectorAll('main, main *, .footer-top, .footer-top *')]
      .filter((element) => !['SCRIPT', 'STYLE'].includes(element.tagName))
      .map((element) => [element.tagName, element.getAttribute('class')]),
    styles: ['main', 'h1', '.site-header', '.site-footer', '.tool-card'].map((selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const css = getComputedStyle(element);
      return [
        css.backgroundColor,
        css.color,
        css.fontFamily,
        css.fontSize,
        css.borderRadius,
        css.padding,
      ];
    }),
    navigation: [...document.querySelectorAll('.desktop-nav a')].map((link) => link.className),
  }));
}

for (const locale of locales.filter((locale) => locale !== 'en')) {
  test(`${locale} pages render translated content and reciprocal SEO without JavaScript`, async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);
    const d = JSON.parse(
      await readFile(new URL(`../src/lib/i18n/messages/${locale}.json`, import.meta.url), 'utf8'),
    );
    const copy = JSON.parse(
      await readFile(
        new URL(`../src/lib/i18n/site-messages/${locale}.json`, import.meta.url),
        'utf8',
      ),
    );
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
      await page.goto('/');
      const englishDesign = await pageDesign(page);
      await page.goto(`/${locale}`);
      expect(await pageDesign(page)).toEqual(englishDesign);
      await expect(page.locator('header a[href="/workspace"]')).toHaveCount(0);
      await expect(page.locator('main .tool-card')).toHaveCount(12);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('h1')).toContainText(copy['Free online PDF tools.']);
      await expect(page.locator('h1 span')).toHaveText(copy['Edit. Merge. Sign.']);
      await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://folio.example/${locale}`,
      );
      await expect(page.locator('head link[hreflang="en-US"]')).toHaveAttribute(
        'href',
        /^https:\/\/folio\.example\/?$/,
      );
      await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
        'content',
        'index, follow',
      );
      await page
        .locator('footer')
        .getByRole('link', { name: d.catalog['merge-pdf'].name, exact: true })
        .first()
        .click();
      await expect(page).toHaveURL(`/${locale}/merge-pdf`);
      await expect(page.locator('h1')).toContainText(d.catalog['merge-pdf'].name);
      await expect(page.locator('head link[hreflang="x-default"]')).toHaveAttribute(
        'href',
        'https://folio.example/merge-pdf',
      );
      await expect(
        page.getByRole('button', { name: d.ui['Choose files'], exact: true }),
      ).toBeVisible();
      const schema = (await page.locator('script[type="application/ld+json"]').allTextContents())
        .map((s) => JSON.parse(s))
        .find((s) => s['@type'] === 'SoftwareApplication');
      expect(schema.inLanguage).toBe(locale);
      for (const path of translatedPaths) {
        const response = await request.get(languagePath(locale, path));
        expect(response.status(), `${locale}${path}`).toBe(200);
      }
    } finally {
      await context.close();
    }
  });
}

test('language selector retains the tool, works on mobile, and returns to English', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/merge-pdf');
  await page.locator('header summary').click();
  await page.locator('header a[lang="de"]').click();
  await expect(page).toHaveURL('/de/merge-pdf');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('header summary').click();
  await page.locator('header a[lang="ja"]').click();
  await expect(page).toHaveURL('/ja/merge-pdf');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.locator('header summary').click();
  await page.locator('header a[lang="en"]').click();
  await expect(page).toHaveURL('/merge-pdf');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  for (const path of ['/fr/workspace', '/de/missing', '/zz/merge-pdf'])
    expect((await request.get(path)).status()).toBe(404);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const locale of locales)
    for (const path of translatedPaths.filter(
      (path) => !tools.some((tool) => path === `/${tool.slug}` && !tool.available),
    ))
      expect(sitemap).toContain(`<loc>https://folio.example${languagePath(locale, path)}</loc>`);
  expect(sitemap).toContain('hreflang="de-CH"');
  expect(errors).toEqual([]);
});

test('German merge and French split produce PDFs with the expected pages', async ({ page }) => {
  const first = await PDFDocument.create();
  first.addPage([300, 400]);
  const second = await PDFDocument.create();
  second.addPage([500, 600]);
  await page.goto('/de/merge-pdf');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles([
      { name: 'first.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await first.save()) },
      { name: 'second.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await second.save()) },
    ]);
  await page.getByRole('button', { name: 'PDFs zusammenfügen', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Herunterladen PDF', exact: true }).click();
  const mergedBytes = await readFile((await (await download).path())!);
  const merged = await PDFDocument.load(mergedBytes);
  expect(merged.getPages().map((page) => page.getWidth())).toEqual([300, 500]);
  await page.goto('/fr/split-pdf');
  const chooseSplitFile = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choisir un fichier', exact: true }).click();
  await (
    await chooseSplitFile
  ).setFiles({ name: 'merged.pdf', mimeType: 'application/pdf', buffer: mergedBytes });
  await page.getByRole('textbox', { name: 'Pages', exact: true }).fill('2');
  await page.getByRole('button', { name: 'Diviser le PDF', exact: true }).click();
  const splitDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger PDF', exact: true }).click();
  const split = await PDFDocument.load(await readFile((await (await splitDownload).path())!));
  expect(split.getPageCount()).toBe(1);
  expect(split.getPage(0).getWidth()).toBe(500);
  await page.locator('main a[href="/fr/merge-pdf"]').click();
  await expect(
    page.getByRole('button', { name: 'Choisir des fichiers', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.file-row')).toHaveCount(0);
});

test('Japanese mobile PDF download uses translated save controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const pdf = await PDFDocument.create();
  pdf.addPage();
  await page.goto('/ja/compress-pdf');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'ファイルを選択', exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: 'mobile.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  });
  await page.getByRole('button', { name: 'PDFを最適化', exact: true }).click();
  await page.getByRole('button', { name: 'ダウンロード PDF', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'ファイルの準備ができました。' });
  await expect(dialog).toBeVisible();
  const download = page.waitForEvent('download');
  await dialog.getByRole('link', { name: 'ファイルをダウンロード', exact: true }).click();
  const result = await PDFDocument.load(await readFile((await (await download).path())!));
  expect(result.getPageCount()).toBe(1);
});

test('language controls fit small screens and localized homepages remain accessible', async ({
  page,
  request,
}) => {
  for (const width of [1100, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.locator('header summary').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.locator('header a[lang="ja"]')).toBeVisible();
  }
  await page.goto('/de');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  for (const title of ['PDF編集', 'PDF 편집']) {
    const response = await request.get(`/og?title=${encodeURIComponent(title)}`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  }
});

test('localized upload and the return to another tool preserve the file and language', async ({
  page,
}) => {
  const de = JSON.parse(await readFile('src/lib/i18n/feature-messages/de.json', 'utf8'));
  const pdf = await PDFDocument.create();
  pdf.addPage();
  await page.goto('/de');
  await page.locator('input[type=file]').setInputFiles({
    name: 'language-handoff.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(page).toHaveURL(/\/workspace\?/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.getByRole('textbox', { name: de['Document name'] })).toHaveValue(
    'language-handoff.pdf',
  );
  expect(
    await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('folio-document-handoff', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const count = await new Promise<number>((resolve) => {
        const request = db.transaction('files').objectStore('files').count();
        request.onsuccess = () => resolve(request.result);
      });
      db.close();
      return count;
    }),
  ).toBe(0);
  await expect(page.locator('.editor-header a[href="/de/tools"]')).toBeVisible();
  await page.getByRole('combobox', { name: de['Continue with another tool'] }).click();
  await page.getByRole('option', { name: de['Merge with another PDF'], exact: true }).click();
  await page
    .getByRole('dialog', { name: de['Are you sure you want to leave?'] })
    .getByRole('button', { name: de['Leave editor'], exact: true })
    .click();
  await expect(page).toHaveURL(/\/de\/merge-pdf\?handoff=/);
  await expect(page.locator('.file-row')).toContainText('language-handoff-edited.pdf');
  await expect(page.locator('header summary')).toContainText('DE');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
});

test('language preference survives navigation, reloads, editor visits and explicit English selection', async ({
  page,
  context,
}) => {
  await page.goto('/merge-pdf?source=language-test#main');
  await page.locator('header summary').click();
  await page.locator('header a[lang="de"]').click();
  await expect(page).toHaveURL('/de/merge-pdf?source=language-test#main');

  await page.locator('.desktop-nav a[href="/de/pricing"]').click();
  await expect(page).toHaveURL('/de/pricing');
  await expect(page.locator('header summary')).toContainText('DE');
  await expect(page.locator('.desktop-nav a[href="/de/tools"]')).toHaveText('PDF-Tools');
  await expect(page.locator('footer a[href="/de/merge-pdf"]')).toBeVisible();
  await page.reload();
  await expect(page.locator('header summary')).toContainText('DE');
  await expect(page.locator('.desktop-nav a[href="/de/tools"]')).toHaveText('PDF-Tools');

  // Resource pages retain both their content and the chosen language.
  await page.locator('header summary').click();
  await page.locator('header a[lang="fr"]').click();
  await expect(page).toHaveURL('/fr/pricing');
  await expect(page.locator('header summary')).toContainText('FR');
  await page.locator('footer a[href="/fr/merge-pdf"]').click();
  await expect(page).toHaveURL('/fr/merge-pdf');
  await page.goBack();
  await expect(page).toHaveURL('/fr/pricing');
  await expect(page.locator('header summary')).toContainText('FR');

  await page.goto('/workspace');
  await page.locator('.editor-header a[href="/fr/tools"]').click();
  await expect(page).toHaveURL('/fr/tools');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  const otherTab = await context.newPage();
  await otherTab.goto('/tools?category=Convert#main');
  await expect(otherTab).toHaveURL('/fr/tools?category=Convert#main');
  await otherTab.close();

  await page.locator('header summary').click();
  await page.locator('header a[lang="en"]').click();
  await expect(page).toHaveURL('/tools');
  await expect(page.locator('header summary')).toContainText('EN');
  await page.locator('.desktop-nav a[href="/pricing"]').click();
  await expect(page.locator('header summary')).toContainText('EN');
  await page.goto('/merge-pdf');
  await expect(page).toHaveURL('/merge-pdf');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('header summary')).toContainText('EN');
});

test('all translated tool layouts and the directory match the English design', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    for (const path of ['/tools', ...translatedToolSlugs.map((slug) => `/${slug}`)]) {
      await page.goto(path);
      const english = await pageDesign(page);
      await page.goto(`/de${path}`);
      expect(await pageDesign(page), path).toEqual(english);
      await expect(page.locator('header .header-editor-link')).toHaveCount(0);
    }
    await page.goto('/de/tools?category=Convert&q=PDF');
    await expect(page.locator('.category-tabs a.active')).toHaveText('Konvertieren');
    await expect(page.locator('form.directory-search')).toHaveAttribute('action', '/de/tools');
    const links = await page
      .locator('.category-tabs a')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(links.every((href) => href?.startsWith('/de/tools?q=PDF'))).toBe(true);
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, follow',
    );
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://folio.example/de/tools?q=PDF&category=Convert',
    );
    await expect(page.locator('main .tool-card[href="/de/image-to-pdf"]')).toHaveCount(1);
  } finally {
    await context.close();
  }
});

test('translated search, filters and navigation keep the full English tool catalog', async ({
  page,
}) => {
  const copy = JSON.parse(
    await readFile(new URL('../src/lib/i18n/site-messages/de.json', import.meta.url), 'utf8'),
  );
  await page.goto('/de');
  await page.getByRole('button', { name: copy['Organize'], exact: true }).click();
  await expect(page.locator('main .tool-card')).toHaveCount(6);
  await page.getByRole('button', { name: copy['Popular'], exact: true }).click();
  await page.locator('main input[type="search"]').fill('zusammen');
  await expect(page.locator('main .tool-card[href="/de/merge-pdf"]')).toBeVisible();
  await page.locator('.search-trigger').click();
  await page.locator('.search-dialog input').fill('zusammen');
  await expect(page.locator('.search-dialog a[href="/de/merge-pdf"]')).toBeVisible();
  await page.keyboard.press('Escape');
  for (const locale of ['de', 'fr', 'ja', 'ko']) {
    for (const width of [1440, 1100, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}`);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${locale} ${width}`,
      ).toBe(true);
      await expect(page.locator('header a[href="/workspace"]')).toHaveCount(0);
    }
  }
});

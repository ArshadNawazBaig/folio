import { test, expect } from './fixtures/editor-storage';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { createSample } from '../src/lib/sample';
import { tools } from '../src/lib/tools';
import { guides } from '../src/lib/guides';
const sample = await createSample();
const upload = { name: 'sample.pdf', mimeType: 'application/pdf', buffer: Buffer.from(sample) };

test('public content, canonical links, metadata, and schemas are present in server HTML', async ({
  request,
}) => {
  const titles = new Set<string>();
  for (const route of [
    '/',
    '/tools',
    '/forms',
    '/convert',
    ...tools.map((t) => `/${t.slug}`),
    ...guides.map((g) => `/guides/${g.slug}`),
  ]) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
    const html = await response.text();
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    expect(title, route).toBeTruthy();
    expect(titles.has(title!), route).toBe(false);
    titles.add(title!);
    expect(html, route).toMatch(/<h1[^>]*>/);
    expect(html, route).toContain('name="description"');
    expect(html, route).toContain('rel="canonical"');
    expect(html, route).toContain('property="og:title"');
    expect(html, route).toContain('name="twitter:card"');
    if (tools.some((t) => t.available && route === `/${t.slug}`)) {
      expect(html).toContain('SoftwareApplication');
      expect(html).toContain('BreadcrumbList');
    }
  }
  for (const route of ['/workspace', '/documents', '/translate-pdf', '/pdf-to-word']) {
    const response = await request.get(route);
    expect(await response.text()).toMatch(/name="robots" content="noindex, nofollow"/);
  }
  expect((await request.get('/workspace')).headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect((await request.get('/this-page-does-not-exist')).status()).toBe(404);
  const redirect = await request.get('/pdf-editor', { maxRedirects: 0 });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toBe('/edit-pdf');
  expect((await request.get('/og?title=Edit%20PDF')).headers()['content-type']).toContain(
    'image/png',
  );
});

test('homepage is usable without JavaScript and mobile navigation stays within the viewport', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your documents.');
  await page
    .getByRole('main')
    .getByRole('link', { name: 'Explore all tools', exact: true })
    .click();
  await expect(page).toHaveURL(/\/tools/);
  await context.close();
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto('/');
  await expect
    .poll(() => mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await mobile.getByRole('button', { name: 'Open navigation' }).click();
  await mobile
    .getByRole('navigation', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Forms' })
    .click();
  await expect(mobile).toHaveURL(/\/forms/);
  await mobile.close();
});

test('search finds tools using ordinary language', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Search tools', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search PDF tools' }).fill('make my pdf smaller');
  await page
    .getByRole('dialog')
    .getByRole('link', { name: /Compress PDF/ })
    .click();
  await expect(page).toHaveURL(/\/compress-pdf/);
});

test('editor exports actual annotations and automatically saves a guest workspace', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  await page.getByRole('textbox', { name: 'Your text', exact: true }).fill('Reviewed in Folio');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const file = await downloaded;
  const bytes = new Uint8Array(await readFile((await file.path())!));
  expect(bytes.length).toBeGreaterThan(sample.length);
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = getDocument({ data: bytes, useSystemFonts: true });
  const pdf = await loading.promise;
  const text = await (await pdf.getPage(1)).getTextContent();
  expect(text.items.map((i) => ('str' in i ? i.str : '')).join(' ')).toContain('Reviewed in Folio');
  await loading.destroy();
  await expect(page.getByRole('button', { name: 'Save locally' })).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+s');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await expect(page).toHaveURL(/cloud=/);
  await page.reload();
  await expect(page.locator('.annotation-text')).toContainText('Reviewed in Folio');
  expect(errors).toEqual([]);
});

test('merge produces a six-page PDF and extraction honors a page range', async ({ page }) => {
  await page.goto('/merge-pdf');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles([upload, { ...upload, name: 'second.pdf' }]);
  await expect(page.getByRole('button', { name: 'Merge PDFs', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Merge PDFs', exact: true }).click();
  await expect(page.getByText('All done. Nicely handled.')).toBeVisible();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const result = await event;
  expect((await PDFDocument.load(await readFile((await result.path())!))).getPageCount()).toBe(6);
  await page.goto('/split-pdf');
  await page.locator('input[type=file]').first().setInputFiles(upload);
  await expect(page.getByRole('button', { name: 'Split PDF', exact: true })).toBeEnabled();
  await page.getByLabel('Pages', { exact: true }).fill('2-3');
  await page.getByRole('button', { name: 'Split PDF', exact: true }).click();
  const splitEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const split = await splitEvent;
  expect((await PDFDocument.load(await readFile((await split.path())!))).getPageCount()).toBe(2);
});

test('PDF image conversion returns actual PNG files', async ({ page }) => {
  await page.goto('/pdf-to-png');
  await page.locator('input[type=file]').first().setInputFiles(upload);
  await expect(page.getByRole('button', { name: 'Convert to PNG', exact: true })).toBeEnabled();
  await page.getByLabel('Pages', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Convert to PNG', exact: true }).click();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download ZIP', exact: true }).click();
  const downloaded = await event;
  const zip = await JSZip.loadAsync(await readFile((await downloaded.path())!));
  const files = Object.values(zip.files);
  expect(files).toHaveLength(1);
  expect([...(await files[0].async('uint8array')).slice(0, 8)]).toEqual([
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);
});

test('form templates export filled fields', async ({ page }) => {
  await page.goto('/forms');
  await page.getByRole('button', { name: /Team introduction/ }).click();
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('textbox', { name: 'Full name *', exact: true }).fill('Sam Rivera');
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const downloaded = await event;
  const pdf = await PDFDocument.load(await readFile((await downloaded.path())!));
  expect(pdf.getForm().getTextField('Full name').getText()).toBe('Sam Rivera');
});

test('new form fields can be added and exported', async ({ page }) => {
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'More tools', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Text field', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 80, y: 150 } });
  await page.getByRole('textbox', { name: 'Unique field name' }).fill('Customer name');
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const downloaded = await event;
  const pdf = await PDFDocument.load(await readFile((await downloaded.path())!));
  expect(pdf.getForm().getTextField('Customer name')).toBeTruthy();
});

test('translation accurately shows its unavailable service and previews a PDF locally', async ({
  page,
}) => {
  await page.goto('/translate-pdf');
  await expect(page.getByRole('button', { name: 'Translate PDF', exact: true })).toBeDisabled();
  await page.locator('input[type=file]').setInputFiles(upload);
  await expect(page.locator('.translation-canvas canvas')).toBeVisible();
  await page.getByRole('combobox', { name: 'Translate into', exact: true }).click();
  await page.getByRole('combobox', { name: 'Search languages' }).fill('Urdu');
  await page.getByRole('option', { name: 'Urdu', exact: true }).click();
  await expect(
    page.locator('.translation-pane-header').filter({ hasText: 'Urdu document' }),
  ).toBeVisible();
});

test('public pages meet automated accessibility checks', async ({ page }) => {
  for (const route of ['/', '/tools', '/edit-pdf', '/forms', '/translate-pdf', '/documents']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      route,
    ).toEqual([]);
  }
});

test('invalid files and page ranges show a useful error without exporting', async ({ page }) => {
  await page.goto('/split-pdf');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'damaged.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('not a pdf'),
    });
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'could not be read as a PDF',
  );
  await page.locator('input[type=file]').first().setInputFiles(upload);
  await expect(page.getByRole('button', { name: 'Split PDF', exact: true })).toBeEnabled();
  await page.getByLabel('Pages', { exact: true }).fill('99');
  await page.getByRole('button', { name: 'Split PDF', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('between 1 and 3');
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toHaveCount(0);
});

test('editor canvas can be reached and operated with a keyboard', async ({ page }) => {
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  const canvas = page.getByRole('region', { name: 'Document canvas' });
  await canvas.focus();
  await expect(canvas).toBeFocused();
  await page.getByRole('button', { name: 'Add text', exact: true }).focus();
  await page.keyboard.press('Enter');
  await canvas.focus();
  await page.keyboard.press('Enter');
  const input = page.getByRole('textbox', { name: 'Edit added text', exact: true });
  await expect(input).toBeFocused();
  await input.press('Escape');
  const annotation = page.getByRole('button', { name: 'text: Your text here' });
  await expect(annotation).toBeVisible();
  await annotation.focus();
  const before = await annotation.boundingBox();
  await page.keyboard.press('Shift+ArrowRight');
  const after = await annotation.boundingBox();
  expect(after!.x).toBeGreaterThan(before!.x);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
});

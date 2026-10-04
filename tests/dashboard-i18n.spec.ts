import { test, expect } from './fixtures/editor-storage';
import { mockGoogle } from './fixtures/auth';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import AxeBuilder from '@axe-core/playwright';
import { locales, languagePath } from '../src/lib/i18n/config';
import type { Locale } from '../src/lib/i18n/config';

async function copy(locale: Locale): Promise<Record<string, string>> {
  return JSON.parse(
    await readFile(
      new URL(`../src/lib/i18n/dashboard-messages/${locale}.json`, import.meta.url),
      'utf8',
    ),
  );
}

for (const locale of locales) {
  test(`${locale} dashboard has all language options and keeps its private layout`, async ({
    page,
    request,
  }) => {
    const messages = await copy(locale);
    const response = await page.goto(languagePath(locale, '/dashboard?view=files'));
    expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow');
    // Next dev uses no-cache; production private routes use no-store.
    expect(response?.headers()['cache-control']).toMatch(/no-store|no-cache/);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      messages['A home for your documents.'],
    );
    await expect(
      page.getByRole('button', { name: messages['Upload PDF'], exact: true }),
    ).toBeEnabled();
    await expect(page.locator('.site-header, .site-footer')).toHaveCount(0);
    await expect(page.locator('aside nav a')).toHaveCount(6);
    await expect(page.locator('main')).toContainText(messages['100 MB, ready to use.']);
    await expect(page.locator('aside')).toContainText(messages['100 MB']);
    await expect(page.locator('header summary')).toContainText(locale.toUpperCase());
    await page.locator('header summary').click();
    await expect(page.locator('header a[hreflang]')).toHaveCount(12);
    for (const option of locales) {
      await expect(page.locator(`header a[lang="${option}"]`)).toHaveAttribute(
        'href',
        languagePath(option, '/dashboard?view=files'),
      );
    }
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).not.toContain('/dashboard');
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });
}

test('dashboard switches language on the current tab, retains guest files and works on small screens', async ({
  page,
  workspaceStorage,
}, testInfo) => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  await page.goto('/dashboard?view=files');
  await expect(page.getByRole('button', { name: 'Upload PDF', exact: true })).toBeEnabled();
  await page.getByLabel('Upload PDF to cloud').setInputFiles({
    name: 'Language test.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  });
  await expect(page.getByRole('link', { name: 'Language test.pdf', exact: true })).toBeVisible();
  await page.locator('header summary').click();
  await page.locator('header a[lang="de"]').click();
  await expect(page).toHaveURL('/de/dashboard?view=files');
  await expect(page.getByRole('link', { name: 'Language test.pdf', exact: true })).toBeVisible();
  expect(workspaceStorage.records.size).toBe(1);
  await page.locator('aside a[href="/de/dashboard?view=settings"]').click();
  for (const width of [1440, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('header summary').click();
    const menu = await page.locator('header nav[aria-label] details > nav').boundingBox();
    expect(menu).toBeTruthy();
    expect(menu!.x).toBeGreaterThanOrEqual(0);
    expect(menu!.x + menu!.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.locator('header summary').click();
  }
  await page.locator('header summary').click();
  await page.locator('header a[lang="ja"]').click();
  await expect(page).toHaveURL('/ja/dashboard?view=settings');
  const ja = await copy('ja');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(ja['Make yourself at home.']);
  await expect(
    page.getByRole('button', { name: ja['Continue with Google'], exact: true }),
  ).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations,
  ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('japanese-dashboard-mobile.png'),
    fullPage: true,
  });
  await page.locator('header summary').click();
  expect(
    (await new AxeBuilder({ page }).include('header').withTags(['wcag2a', 'wcag2aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.locator('header a[lang="en"]').click();
  await expect(page).toHaveURL('/dashboard?view=settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Make yourself at home.');
});

test('translated dashboard sign-in and account tabs keep their language and user data', async ({
  page,
  context,
}) => {
  await mockGoogle(context);
  const de = await copy('de'),
    fr = await copy('fr');
  await page.goto('/de/dashboard?view=settings');
  await page.getByRole('button', { name: de['Continue with Google'], exact: true }).click();
  await expect(page).toHaveURL('/de/dashboard?view=settings');
  await expect(page.getByLabel(de['Full name'], { exact: true })).toHaveValue('Fixture User');
  await page.locator('header summary').click();
  await page.locator('header a[lang="fr"]').click();
  await expect(page).toHaveURL('/fr/dashboard?view=settings');
  await expect(page.getByLabel(fr['Full name'], { exact: true })).toHaveValue('Fixture User');
  await expect(page.locator('aside')).toContainText(fr['1 GB']);
  await expect(page.locator('main')).not.toContainText(fr['100 MB, ready to use.']);
  await expect(page.getByLabel(fr['Email address'], { exact: true })).toHaveValue(
    'customer@example.test',
  );
  await page.getByLabel(fr['Company'], { exact: false }).fill('Translation test');
  await page.getByRole('button', { name: fr['Save profile'], exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: fr['Your profile has been saved.'] }),
  ).toBeVisible();
  for (const [view, title] of [
    ['links', 'Good links. All together.'],
    ['invoices', 'Good work, clearly billed.'],
    ['support', 'A little help, right here.'],
  ]) {
    await page.locator(`aside a[href="/fr/dashboard?view=${view}"]`).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(fr[title]);
    await expect(page.locator('header summary')).toContainText('FR');
  }
  await expect(page.getByLabel(fr['Subject'], { exact: true })).toBeVisible();
  await page
    .getByRole('button', {
      name: fr['{value0} — account menu'].replace('{value0}', 'Fixture User'),
    })
    .click();
  await page.getByRole('menuitem', { name: fr['Profile settings'], exact: true }).click();
  await expect(page).toHaveURL('/fr/dashboard?view=settings');
  await expect(page.getByLabel(fr['Full name'], { exact: true })).toHaveValue('Fixture User');
  await expect(page.locator('aside')).toContainText(fr['1 GB']);
  await expect(page.locator('main')).not.toContainText(fr['100 MB, ready to use.']);
  await page.reload();
  await expect(page.locator('header summary')).toContainText('FR');

  // Unprefixed redirects and bookmarks restore the preference, including the selected tab.
  await page.goto('/dashboard?view=files#main');
  await expect(page).toHaveURL('/fr/dashboard?view=files#main');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    fr['A home for your documents.'],
  );
  await page.locator('header summary').click();
  await page.locator('header a[lang="en"]').click();
  await expect(page).toHaveURL('/dashboard?view=files#main');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A home for your documents.');
});

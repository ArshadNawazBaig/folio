import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { tools } from '../src/lib/tools';
import { guides } from '../src/lib/guides';

test('Google can crawl the production sitemap and private workspaces stay noindex', async ({
  request,
}) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Allow: /');
  expect(robots).not.toMatch(/Disallow: \/\s/);
  expect(robots).toContain('Sitemap: https://folio.example/sitemap.xml');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const tool of tools) {
    expect(sitemap.includes(`<loc>https://folio.example/${tool.slug}</loc>`), tool.slug).toBe(
      tool.available,
    );
  }
  for (const guide of guides) expect(sitemap).toContain(`/guides/${guide.slug}</loc>`);
  for (const path of ['/workspace', '/dashboard', '/account', '/admin', '/support']) {
    expect(sitemap).not.toContain(`<loc>https://folio.example${path}</loc>`);
    const response = await request.get(path);
    expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
    expect(await response.text()).toContain('name="robots" content="noindex, nofollow"');
  }
});

test('directory pagination, filtering and search work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('/tools');
    const seen = new Set<string>();
    const titles = new Set<string>();
    for (let index = 1; index <= 3; index++) {
      titles.add(await page.title());
      for (const href of await page
        .locator('.directory-card')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')!)))
        seen.add(href);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://folio.example/tools${index > 1 ? `?page=${index}` : ''}`,
      );
      if (index < 3) await page.getByRole('link', { name: 'Next page', exact: true }).click();
    }
    expect(titles.size).toBe(3);
    expect([...seen].sort()).toEqual(tools.map((tool) => `/${tool.slug}`).sort());
    await page
      .getByRole('navigation', { name: 'Filter tools' })
      .getByRole('link', { name: 'Convert', exact: true })
      .click();
    await expect(page.locator('.directory-card small').first()).toHaveText('Convert');
    await page.getByRole('textbox', { name: 'Find a PDF tool' }).fill('WEBP');
    await page.getByRole('button', { name: 'Search directory' }).click();
    await expect(
      page.locator('.directory-card').getByRole('heading', { name: 'JPG to WEBP', exact: true }),
    ).toBeVisible();
    await expect(
      page.locator('.directory-card').getByRole('heading', { name: 'WEBP to JPG', exact: true }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  } finally {
    await context.close();
  }
});

test('blog pagination and article sections have matching crawlable metadata and links', async ({
  page,
  request,
}) => {
  await page.goto('/blog?page=2');
  await expect(page).toHaveTitle(/Page 2/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://folio.example/blog?page=2',
  );
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const collection = schemas
    .map((value) => JSON.parse(value))
    .find((value) => value['@type'] === 'CollectionPage');
  expect(collection.mainEntity.itemListElement).toHaveLength(10);
  expect(collection.mainEntity.itemListElement[0].position).toBe(11);
  await page.goto('/blog?q=Pagination&category=Pagination+guides');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://folio.example/blog?q=Pagination&category=Pagination+guides',
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await page.goto('/blog/better-paperwork');
  const contents = page.getByRole('navigation', { name: 'On this page' });
  await expect(contents.getByRole('link')).toHaveCount(2);
  await contents.getByRole('link', { name: 'Make the next step simple.' }).click();
  const fragment = new URL(page.url()).hash;
  await expect(page.locator(fragment)).toHaveText('Make the next step simple.');
  await expect(page.locator('time[datetime="2026-08-14T12:00:00Z"]')).toContainText('Updated');
  for (const path of ['/favicon.ico', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toMatch(/^image\//);
  }
});

test('per-page controls remain custom and guide navigation matches the article metadata', async ({
  page,
}) => {
  await page.goto('/tools');
  const pagination = page.getByRole('navigation', { name: 'Tools pagination' });
  await pagination.getByRole('combobox', { name: 'Records per page' }).click();
  await page.getByRole('option', { name: '25 per page', exact: true }).click();
  await expect(page.locator('.directory-card')).toHaveCount(25);
  await expect(page).toHaveURL(/pageSize=25/);
  await page.reload();
  await expect(page.locator('.directory-card')).toHaveCount(25);
  await page.goto('/guides/how-to-sign-a-pdf');
  await expect(
    page.getByRole('navigation', { name: 'On this page' }).getByRole('link'),
  ).toHaveCount(4);
  await page.getByRole('link', { name: 'Create a clear signature', exact: true }).click();
  await expect(page).toHaveURL(/#section-2$/);
  await expect(page.locator('time')).toHaveAttribute('datetime', '2026-09-15');
  const schemas = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) => scripts.map((script) => JSON.parse(script.textContent!)));
  const article = schemas.find((schema) => schema['@type'] === 'Article');
  expect(article.dateModified).toBe('2026-09-15');
  expect(article.datePublished).toBe('2026-09-15');
  expect(article.publisher.name).toBe('Folio');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});

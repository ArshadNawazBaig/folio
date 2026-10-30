import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { consolidatedArticles } from '../src/lib/editorial-consolidation';
import { guides } from '../src/lib/guides';
import evidence from '../src/lib/tutorial-evidence.json' with { type: 'json' };

test('old tutorial URLs permanently resolve to the maintained article and disappear from public discovery', async ({
  request,
}) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  const listing = await (await request.get('/blog')).text();
  for (const [slug, target] of Object.entries(consolidatedArticles)) {
    for (const locale of ['', '/fr', '/ja']) {
      const response = await request.get(`${locale}/blog/${slug}`, { maxRedirects: 0 });
      expect(response.status(), locale + slug).toBe(308);
      expect(response.headers().location).toBe(
        locale && target.startsWith('/guides/') ? locale + target : target,
      );
    }
    expect(sitemap).not.toMatch(new RegExp(`<loc>[^<]*/blog/${slug}</loc>`));
    expect(listing).not.toContain(`href="/blog/${slug}"`);
  }
});

test('all guide references and verified downloads are publicly readable with one article heading', async ({
  request,
}) => {
  for (const guide of guides) {
    const response = await request.get(`/guides/${guide.slug}`);
    expect(response.status(), guide.slug).toBe(200);
    const html = await response.text();
    expect(html.match(/<h1(?:\s|>)/g), guide.slug).toHaveLength(1);
    expect(html, guide.slug).toMatch(/href="\/samples\//);
  }
  for (const file of Object.values(evidence.files)) {
    const response = await request.get(file.href);
    expect(response.status(), file.href).toBe(200);
    expect(response.headers()['x-robots-tag'], file.href).toBe('noindex');
    expect((await response.body()).length, file.href).toBeGreaterThan(0);
  }
});

test('worked comparisons stay readable and accessible at narrow widths in English, French, and Japanese', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: true,
    viewport: { width: 320, height: 740 },
  });
  const page = await context.newPage();
  try {
    for (const path of [
      '/create-pdf-form',
      '/guides/why-cant-i-edit-pdf-text',
      '/fr/create-pdf-form',
      '/fr/guides/fillable-pdf-vs-flattened-pdf',
      '/ja/url-shortener',
      '/ja/guides/how-to-password-protect-a-pdf',
    ]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        path,
      ).toBe(true);
      await expect(page.locator('main a[href^="/samples/"]').first()).toBeVisible();
      expect(
        (await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa']).analyze())
          .violations,
        path,
      ).toEqual([]);
    }
  } finally {
    await context.close();
  }
});

test('the journal shows its article content without JavaScript instead of a loading shell', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/blog');
    await expect(page.locator('#main')).toHaveCount(1);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.getByText('Loading the journal…', { exact: true })).toHaveCount(0);
  } finally {
    await context.close();
  }
});

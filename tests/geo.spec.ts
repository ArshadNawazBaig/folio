import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const origin = process.env.GEO_AUDIT_URL
  ? new URL(process.env.GEO_AUDIT_URL).origin
  : 'https://folio.example';
const guidePath = '/guides/does-folio-upload-pdf-files';
const tools = [
  'edit-pdf',
  'edit-pdf-text',
  'merge-pdf',
  'split-pdf',
  'compress-pdf',
  'sign-pdf',
  'image-to-pdf',
  'pdf-to-text',
  'protect-pdf',
];

test('product facts, limitations and source links are readable without JavaScript', async ({
  page,
}) => {
  for (const slug of tools) {
    const response = await page.goto(`/${slug}`);
    expect(response?.status(), slug).toBe(200);
    const facts = page.locator('#tool-facts');
    await expect(facts.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(facts.locator('dt')).toHaveText([
      'Input',
      'Output',
      'Download cost',
      'File handling',
      'Limits to know',
    ]);
    for (const href of ['/pricing', '/privacy', guidePath])
      await expect(facts.locator(`a[href="${href}"]`)).toBeVisible();
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${origin}/${slug}`,
    );
    const applications = (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    )
      .map((text) => JSON.parse(text))
      .filter((schema) => schema['@type'] === 'SoftwareApplication');
    expect(applications).toHaveLength(1);
    expect(applications[0].publisher['@id']).toBe(`${origin}/#organization`);
    if (['edit-pdf-text', 'protect-pdf'].includes(slug)) {
      expect(applications[0].offers).toBeUndefined();
      await expect(facts).toContainText('A paid plan is required');
    }
  }
  await page.goto('/edit-pdf');
  await expect(page.locator('#tool-facts')).toContainText('uploads your PDF');
  await expect(page.locator('#tool-facts')).toContainText(
    'Original-text changes require a paid plan',
  );
  await page.goto('/merge-pdf');
  await expect(page.locator('#tool-facts')).toContainText(
    'Opening the result in the editor uploads it',
  );
});

// These simulate user-agent requests; they cannot prove access from the providers' real IP ranges.
for (const agent of ['Googlebot', 'bingbot', 'OAI-SearchBot', 'PerplexityBot']) {
  test(`${agent} receives public answers in the initial HTML`, async ({ request, page }) => {
    for (const path of ['/merge-pdf', guidePath]) {
      const response = await request.get(path, { headers: { 'User-Agent': agent } });
      expect(response.status(), `${agent} ${path}`).toBe(200);
      expect(response.headers()['x-robots-tag'] || '').not.toMatch(/noindex|nosnippet/i);
      await page.setContent(await response.text());
      const directives = await page
        .locator('meta[name="robots"], meta[name="googlebot"], meta[name="bingbot"]')
        .evaluateAll((tags) => tags.map((tag) => tag.getAttribute('content') || '').join(','));
      expect(directives).not.toMatch(/noindex|nosnippet|max-snippet\s*:\s*0(?:\D|$)/i);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
        'href',
        `${origin}${path}`,
      );
      if (path === '/merge-pdf') {
        await expect(page.locator('#tool-facts')).toContainText('150 MB total');
      } else {
        await expect(page.getByRole('table')).toContainText('private cloud storage');
      }
    }
  });
}

test('discovery and ownership metadata preserve public access and private exclusions', async ({
  request,
  page,
}) => {
  const robotsResponse = await request.get('/robots.txt');
  expect(robotsResponse.status()).toBe(200);
  // This project intentionally has one shared crawler policy; flag any policy change for review.
  const directives = (await robotsResponse.text()).split('\n').map((line) => line.trim());
  expect(directives.filter((line) => /^User-Agent:/i.test(line))).toEqual(['User-Agent: *']);
  expect(directives).toContain('Allow: /');
  expect(directives.filter((line) => /^Disallow:/i.test(line))).toEqual(['Disallow: /api/']);
  expect(directives).toContain(`Sitemap: ${origin}/sitemap.xml`);
  const sitemapResponse = await request.get('/sitemap.xml');
  expect(sitemapResponse.status()).toBe(200);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain(`<loc>${origin}${guidePath}</loc>`);
  for (const path of ['/workspace', '/dashboard', '/account']) {
    expect(sitemap).not.toContain(`<loc>${origin}${path}</loc>`);
    const response = await request.get(path);
    expect(response.headers()['x-robots-tag']).toMatch(/noindex/);
  }
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: 'What is Folio?' })).toBeVisible();
  const schemas = (await page.locator('script[type="application/ld+json"]').allTextContents()).map(
    (text) => JSON.parse(text),
  );
  const about = schemas.find((schema) => schema['@type'] === 'AboutPage');
  expect(about.mainEntity['@id']).toBe(`${origin}/#organization`);
  await expect(page.locator('main')).toContainText(about.mainEntity.description);
  if (!process.env.GEO_AUDIT_URL)
    await expect(page.locator('meta[name="msvalidate.01"]')).toHaveAttribute(
      'content',
      'folio-bing-fixture',
    );
});

test('privacy comparison has working citations and usable mobile layouts', async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(guidePath);
  const table = page.getByRole('table');
  await expect(table.getByRole('row')).toHaveCount(5);
  await table.getByRole('link', { name: 'Editor, page organization, forms and signing' }).click();
  await expect(page).toHaveURL(/\/edit-pdf#tool-facts$/);
  await expect(page.locator('#tool-facts')).toBeInViewport();
  for (const path of ['/edit-pdf', guidePath]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  const context = await browser.newContext({
    javaScriptEnabled: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const accessiblePage = await context.newPage();
    for (const path of ['/edit-pdf', guidePath]) {
      await accessiblePage.goto(new URL(path, page.url()).href);
      expect(
        (
          await new AxeBuilder({ page: accessiblePage })
            .include('#main')
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
    }
  } finally {
    await context.close();
  }
});

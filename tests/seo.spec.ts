import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { tools } from '../src/lib/tools';
import { guides } from '../src/lib/guides';

test('public discovery exposes real FAQs, published feeds, image locations and a security contact', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  await page.addInitScript(() => {
    (window as unknown as { cspErrors: string[] }).cspErrors = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      (window as unknown as { cspErrors: string[] }).cspErrors.push(event.violatedDirective);
    });
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const response = await page.goto('/');
  expect(response!.headers()['content-security-policy']).toContain("object-src 'none'");
  // Social copy can differ from the search title without losing metadata in the initial HTML.
  expect(await response!.text()).toContain(
    'property="og:title" content="Folio — Free Online PDF Tools"',
  );
  await expect(page).toHaveTitle('Free Online PDF Tools — Edit, Merge, Compress & Sign | Folio');
  await expect(page.locator('head meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator('head meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Folio — Free Online PDF Tools',
  );
  await expect(page.locator('head meta[name="author"]')).toHaveAttribute('content', 'Folio');
  await expect(page.locator('head meta[name="format-detection"]')).toHaveAttribute(
    'content',
    'telephone=no, address=no, email=no',
  );
  await expect(
    page.locator('meta[name="twitter:site"], meta[name="twitter:creator"], link[hreflang]'),
  ).toHaveCount(0);
  const shareDescription = await page
    .locator('meta[property="og:description"]')
    .getAttribute('content');
  const twitterDescription = await page
    .locator('meta[name="twitter:description"]')
    .getAttribute('content');
  expect(twitterDescription).not.toBe(shareDescription);
  expect(twitterDescription).toContain('Original-text changes require a paid plan.');
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute('content', /Folio/);
  await expect(page.locator('head link[type="application/rss+xml"]')).toHaveAttribute(
    'href',
    'https://folio.example/feed.xml',
  );
  const faq = (await page.locator('script[type="application/ld+json"]').allTextContents())
    .map((value) => JSON.parse(value))
    .find((schema) => schema['@type'] === 'FAQPage');
  const graph = (await page.locator('script[type="application/ld+json"]').allTextContents())
    .map((value) => JSON.parse(value))
    .find((schema) => schema['@graph'])['@graph'];
  const home = graph.find((node: Record<string, unknown>) => node['@type'] === 'WebPage');
  expect(home.description).toBe(
    await page.locator('meta[name="description"]').getAttribute('content'),
  );
  expect(graph.map((node: Record<string, unknown>) => node['@id'])).toEqual(
    expect.arrayContaining([home.isPartOf['@id'], home.about['@id']]),
  );
  const questions = await page.locator('.faq-list summary').allTextContents();
  expect(faq.mainEntity.map((entry: { name: string }) => entry.name)).toEqual(questions);
  const answers = await page.locator('.faq-list details > p').allTextContents();
  expect(
    faq.mainEntity.map((entry: { acceptedAnswer: { text: string } }) => entry.acceptedAnswer.text),
  ).toEqual(answers);
  for (const path of ['/support', '/about', '/terms', '/security', '/feed.xml'])
    await expect(page.locator(`footer a[href="${path}"]`)).toBeVisible();
  const feedResponse = await request.get('/feed.xml');
  expect(feedResponse.status()).toBe(200);
  expect(feedResponse.headers()['content-type']).toContain('application/rss+xml');
  const feed = await feedResponse.text();
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain(
    '<image:loc>https://images.example.test/journal.webp?w=1200&amp;format=webp</image:loc>',
  );
  for (const xml of [feed, sitemap]) {
    expect(
      await page.evaluate(
        (text) =>
          new DOMParser().parseFromString(text, 'application/xml').querySelector('parsererror')
            ?.textContent || '',
        xml,
      ),
    ).toBe('');
    expect(xml).not.toContain('secret-draft');
    expect(xml).not.toContain('scheduled-story');
  }
  expect(feed).toContain('/blog/better-paperwork</link>');
  expect(feed).toContain('/guides/how-to-sign-a-pdf</link>');
  const security = await request.get('/.well-known/security.txt');
  expect(security.status()).toBe(200);
  expect(security.headers()['content-type']).toContain('text/plain');
  const disclosure = await security.text();
  expect(disclosure).toContain('Contact: https://folio.example/support');
  expect(Date.parse(disclosure.match(/^Expires: (.+)$/m)![1])).toBeGreaterThan(Date.now());
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['/terms', '/security']) {
    await page.goto(path);
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(() => (window as unknown as { cspErrors: string[] }).cspErrors),
    ).toEqual([]);
  }
  expect(errors).toEqual([]);
});

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
  await expect(page.locator('meta[name="author"]')).toHaveAttribute('content', 'Folio editorial');
  expect(await page.locator('meta[name="twitter:image:alt"]').getAttribute('content')).toBe(
    await page.locator('meta[property="og:image:alt"]').getAttribute('content'),
  );
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

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

test('directory shows every tool and supports filtering and search without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto('/tools?page=2&pageSize=25');
    await expect(page).toHaveURL('/tools');
    await expect(page.locator('.directory-card')).toHaveCount(tools.length);
    expect(
      await page
        .locator('.directory-card')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
    ).toEqual(tools.map((tool) => `/${tool.slug}`));
    await expect(page.getByRole('navigation', { name: 'Tools pagination' })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Records per page' })).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://folio.example/tools',
    );
    await page
      .getByRole('navigation', { name: 'Filter tools' })
      .getByRole('link', { name: 'Convert', exact: true })
      .click();
    expect(
      await page
        .locator('.directory-card')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
    ).toEqual(tools.filter((tool) => tool.category === 'Convert').map((tool) => `/${tool.slug}`));
    const search = page.getByRole('searchbox', { name: 'Find a PDF tool' });
    await search.fill('WEBP');
    await search.press('Enter');
    await expect(page.locator('.directory-card[href="/jpg-to-webp"]')).toBeVisible();
    await expect(page.locator('.directory-card[href="/webp-to-jpg"]')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
    await page.getByRole('link', { name: 'Clear tool search' }).click();
    await expect(page.locator('.directory-card')).toHaveCount(
      tools.filter((tool) => tool.category === 'Convert').length,
    );
    await page.goto('/convert?q=WEBP&page=3');
    await expect(page).toHaveURL('/convert?q=WEBP');
    await expect(page.locator('.directory-card[href="/jpg-to-webp"]')).toBeVisible();
  } finally {
    await context.close();
  }
});

for (const width of [1440, 768, 390]) {
  test(`directory cards and search match home and filter the full catalogue at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const searchBox = page.getByRole('search', { name: 'Find a tool' });
    const homeStyle = await searchBox.evaluate((node) => {
      const style = getComputedStyle(node);
      return [style.backgroundColor, style.borderRadius, style.minHeight, style.padding];
    });
    const card = page.locator('.tool-card[href="/edit-pdf"]');
    const cardStyles = (node: Element) => {
      const style = getComputedStyle(node);
      return [
        style.display,
        style.alignItems,
        style.gap,
        style.minHeight,
        style.padding,
        style.borderRadius,
      ];
    };
    const homeCardStyle = await card.evaluate(cardStyles);

    await page.goto('/tools?page=2');
    await expect(page).toHaveURL('/tools');
    await expect(page.locator('.directory-card')).toHaveCount(tools.length);
    expect(await card.evaluate(cardStyles)).toEqual(homeCardStyle);
    expect(
      await page
        .locator('.directory-grid')
        .evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length),
    ).toBe(width > 1000 ? 3 : width > 700 ? 2 : 1);
    await expect(card.locator('.tool-icon')).toHaveCSS('background-color', 'rgb(25, 25, 25)');
    await expect(card.locator('.tool-icon')).toHaveCSS('color', 'rgb(255, 119, 61)');
    await expect(page.getByRole('navigation', { name: 'Tools pagination' })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Records per page' })).toHaveCount(0);
    await page.screenshot({
      path: info.outputPath(`directory-cards-${width}.png`),
      fullPage: true,
    });
    expect(
      await searchBox.evaluate((node) => {
        const style = getComputedStyle(node);
        return [style.backgroundColor, style.borderRadius, style.minHeight, style.padding];
      }),
    ).toEqual(homeStyle);
    const input = searchBox.getByRole('searchbox', { name: 'Find a PDF tool' });
    await expect(input).toHaveAttribute('placeholder', 'Find a PDF tool');
    await expect(page.getByRole('button', { name: 'Search directory' })).toHaveCount(0);
    await input.fill('  HANDWRITTEN  ');
    await expect(page.locator('.directory-card')).toHaveCount(1);
    await expect(page.locator('.directory-card')).toHaveAttribute('href', '/signature-generator');
    await expect(input).toBeFocused();
    await expect(input).toHaveCSS('outline-style', 'none');
    await expect(searchBox).toHaveCSS('outline-style', 'solid');

    await searchBox.getByRole('link', { name: 'Clear tool search' }).click();
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('');
    await expect(page.locator('.directory-card')).toHaveCount(tools.length);
    await expect(page.locator('.directory-card').first()).toHaveAttribute(
      'href',
      '/invoice-generator',
    );

    await input.fill('a tool that does not exist');
    await expect(page.locator('.directory-card')).toHaveCount(0);
    await expect(page.getByText('A different word might do it.')).toBeVisible();
    await page.getByRole('link', { name: 'Show all tools', exact: true }).click();
    await expect(input).toHaveValue('');
    await expect(page.locator('.directory-card')).toHaveCount(tools.length);

    await input.fill('pdf');
    await input.press('Enter');
    await expect(page).toHaveURL('/tools?q=pdf');
    await expect(input).toHaveValue('pdf');
    await page.reload();
    await expect(input).toHaveValue('pdf');

    await page
      .getByRole('navigation', { name: 'Filter tools' })
      .getByRole('link', { name: 'Convert', exact: true })
      .click();
    await expect(page).toHaveURL(/q=pdf&category=Convert$/);
    await expect(input).toHaveValue('pdf');
    await input.fill('invoice');
    await expect(page.locator('.directory-card')).toHaveCount(0);
    await input.fill('WEBP');
    await expect(page.locator('.directory-card[href="/jpg-to-webp"]')).toBeVisible();
    await expect(page.locator('.directory-card[href="/webp-to-jpg"]')).toBeVisible();
    await expect(page.locator('.directory-result-count')).toContainText('WEBP');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath(`directory-search-${width}.png`),
      fullPage: true,
    });
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);

    await page.goto('/convert');
    await expect(page.locator('.directory-card')).toHaveCount(
      tools.filter((tool) => tool.category === 'Convert').length,
    );
    await expect(page.getByRole('navigation', { name: 'Tools pagination' })).toHaveCount(0);
    await input.fill('invoice');
    await expect(page.locator('.directory-card')).toHaveCount(0);
    await input.fill('WEBP');
    await expect(page.locator('.directory-card[href="/jpg-to-webp"]')).toBeVisible();
    await input.press('Enter');
    await expect(page).toHaveURL(/\/convert\?q=WEBP$/);
    await page.reload();
    await expect(input).toHaveValue('WEBP');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://folio.example/convert?q=WEBP',
    );
  });
}

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

test('guide navigation matches the article metadata', async ({ page }) => {
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

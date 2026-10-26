import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { tools } from '../src/lib/tools';
import { guides } from '../src/lib/guides';
import { locales } from '../src/lib/i18n/config';
import { toolSearchTitle, toolSearchDescription } from '../src/lib/tool-seo';
import { toolExamples } from '../src/lib/tool-examples';
import { toolContentUpdated } from '../src/lib/tool-edition';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

test.beforeEach(async ({ context }) => {
  // Keep first-party SEO/layout checks independent of live ad auctions. Ad delivery
  // and its third-party CSP requirements need a separate production integration check.
  await context.route('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js*', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' }),
  );
});

test('local browsing does not load live advertising scripts', async ({ page }) => {
  const adRequests: string[] = [];
  const runtimeErrors: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/pagead/js/adsbygoogle.js')) adRequests.push(request.url());
  });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.goto('/blog');
  await page.getByRole('link', { name: 'Make room for better paperwork.', exact: true }).click();
  await expect(page).toHaveURL('/blog/better-paperwork');
  await expect(page.getByRole('link', { name: 'Iram Shams', exact: true })).toBeVisible();
  await expect(page.locator('script[src*="/pagead/js/adsbygoogle.js"]')).toHaveCount(0);
  expect(adRequests).toEqual([]);
  expect(runtimeErrors).toEqual([]);
});

test('untranslated articles use canonical links and permanent redirects without language loops', async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(120_000);
  const article = '/blog/better-paperwork';
  for (const locale of locales.filter((locale) => locale !== 'en')) {
    const response = await request.get(`/${locale}${article}`, { maxRedirects: 0 });
    expect(response.status(), locale).toBe(308);
    expect(response.headers().location).toBe(article);
  }
  for (const slug of ['secret-draft', 'scheduled-story', 'missing-post']) {
    const response = await request.get(`/nl/blog/${slug}`, { maxRedirects: 0 });
    expect(response.status(), slug).toBe(404);
  }
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const reader = await context.newPage();
    await reader.goto('/nl/blog');
    const links = await reader
      .locator('main a[href^="/blog/"]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
    expect(links).toContain(article);
    await expect(reader.locator('main a[href^="/nl/blog/"]')).toHaveCount(0);
  } finally {
    await context.close();
  }
  await page.addInitScript(() => localStorage.setItem('folio-language', 'nl'));
  await page.goto(`/nl${article}`);
  await expect(page).toHaveURL(article);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    `https://folio.example${article}`,
  );
  // Waiting for the reader controls also exercises the hydrated language provider.
  await expect(page.locator('summary[aria-label$="Nederlands"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Kopieer link', exact: true })).toBeVisible();
  await expect(page).toHaveURL(article);
  expect(await page.evaluate(() => localStorage.getItem('folio-language'))).toBe('nl');
});

test('PDF entry controls fit the first screen and still open the file picker', async ({ page }) => {
  test.setTimeout(120_000);
  for (const viewport of [
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [path, name] of [
      ['/edit-pdf', 'Choose a file'],
      ['/merge-pdf', 'Choose files'],
      ['/edit-pdf-text', 'Choose your PDF'],
    ]) {
      await page.goto(path);
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeEnabled();
      await page.evaluate(() => document.fonts.ready);
      const box = (await button.boundingBox())!;
      expect(box.y, path).toBeGreaterThan(0);
      expect(box.y + box.height, `${path} at ${viewport.width}px`).toBeLessThanOrEqual(
        viewport.height,
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const chooser = page.waitForEvent('filechooser');
      await button.click();
      await (await chooser).setFiles([]);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/edit-pdf-text');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: 'test-results-blog/seo-text-editor-entry-mobile.png' });
  await page.goto('/edit-pdf');
  await expect(page.getByRole('button', { name: 'Choose a file', exact: true })).toBeEnabled();
  await page.screenshot({ path: 'test-results-blog/seo-editor-entry-mobile.png' });
});

test('tool section shortcuts and guide entry links work without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  try {
    for (const prefix of ['', '/de', '/ja']) {
      await page.goto(`${prefix}/edit-pdf`);
      const shortcuts = page.locator('main nav a[href^="#"]');
      const targets = await shortcuts.evaluateAll((links) =>
        links.map((link) => ({
          href: link.getAttribute('href'),
          exists: !!document.getElementById(link.getAttribute('href')!.slice(1)),
        })),
      );
      expect(targets.length).toBeGreaterThanOrEqual(4);
      expect(targets.every((target) => target.exists)).toBe(true);
      expect(targets.some((target) => target.href === '#worked-example')).toBe(prefix === '');
      await page.locator('main nav a[href="#how-to"]').click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/edit-pdf#how-to$`));
      await expect(page.locator('#how-to h2')).toBeInViewport();
      await page.goto(`${prefix}/guides/how-to-edit-a-pdf-on-mobile`);
      const start = page.locator('.article-heading a.button');
      await expect(start).toHaveAttribute('href', `${prefix}/edit-pdf`);
      await expect(start).toBeInViewport();
      await start.click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/edit-pdf$`));
      await page.goto(`${prefix}/guides`);
      await expect(page.locator('main nav a[href^="#"]')).toHaveCount(6);
      await expect(page.locator('.guides-grid a')).toHaveCount(guides.length);
      await page.locator('main nav a[href="#conversion"]').click();
      await expect(page.locator('#conversion > h2')).toBeInViewport();
      await expect(page.locator('#conversion .guides-grid a').first()).toHaveAttribute(
        'href',
        `${prefix}/guides/how-to-convert-pdf-to-images`,
      );
    }
  } finally {
    await context.close();
  }
});

test('the full tool catalog has crawlable discovery links and task-specific search metadata', async ({
  browser,
  request,
}) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  try {
    for (const locale of ['en', 'de', 'ja']) {
      const prefix = locale === 'en' ? '' : `/${locale}`;
      await page.goto(prefix || '/');
      const linked = await page
        .locator('.home-tool-collections a')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')).sort());
      expect(linked).toEqual(
        tools
          .filter((tool) => tool.available)
          .map((tool) => `${prefix}/${tool.slug}`)
          .sort(),
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    for (const tool of tools) {
      const response = await request.get(`/${tool.slug}`);
      expect(response.status(), tool.slug).toBe(200);
      const metadata = await page.evaluate(
        (html) => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          return {
            title: doc.title,
            description: doc.querySelector('meta[name="description"]')?.getAttribute('content'),
            canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
            robots: doc.querySelector('meta[name="robots"]')?.getAttribute('content'),
            headingCount: doc.querySelectorAll('h1').length,
            example: doc.querySelector('#worked-example h2')?.textContent,
            samples: [...doc.querySelectorAll('#worked-example a[download]')].map((link) =>
              link.getAttribute('href'),
            ),
            related: [...doc.querySelectorAll('.related-tools a')].map((link) =>
              link.getAttribute('href'),
            ),
          };
        },
        await response.text(),
      );
      expect(metadata.title, tool.slug).toBe(toolSearchTitle(tool));
      expect(metadata.description, tool.slug).toBe(toolSearchDescription(tool));
      expect(metadata.canonical).toBe(`https://folio.example/${tool.slug}`);
      expect(metadata.robots).toBe(tool.available ? 'index, follow' : 'noindex, nofollow');
      expect(metadata.headingCount).toBe(1);
      expect(metadata.example, tool.slug).toBe(toolExamples[tool.slug]?.title);
      expect(metadata.example, tool.slug).toBeTruthy();
      for (const sample of metadata.samples) {
        expect(sample).toMatch(/^\/samples\//);
        const file = await request.get(sample!);
        expect(file.status(), sample!).toBe(200);
        expect(file.headers()['content-type'], sample!).toMatch(/^(application\/pdf|image\/)/);
      }
      if (tool.slug === 'create-qr-code') {
        expect(metadata.related).toContain('/url-shortener');
        expect(metadata.related).not.toContain('/protect-pdf');
      }
    }
  } finally {
    await context.close();
  }
});

test('practical examples are accessible on mobile and their compression instructions produce the stated output', async ({
  page,
}) => {
  await page.goto('/compress-images');
  await page.waitForLoadState('networkidle');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page
      .locator('#worked-example')
      .screenshot({ path: `test-results-blog/tool-example-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (
        await new AxeBuilder({ page })
          .include('#worked-example')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
  await page.getByRole('button', { name: '20 KB', exact: true }).click();
  await page.getByRole('combobox', { name: 'Output format', exact: true }).click();
  await page.getByRole('option', { name: 'JPG', exact: true }).click();
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles('public/samples/practice-receipt.jpg');
  await page.getByRole('button', { name: 'Compress images', exact: true }).click();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download image', exact: true }).click();
  const download = await event;
  const bytes = await readFile((await download.path())!);
  expect(bytes.length).toBeLessThanOrEqual(20_000);
  const info = await sharp(bytes).metadata();
  expect(info.format).toBe('jpeg');
  expect(info.width).toBeGreaterThan(0);
  expect(info.height).toBeGreaterThan(0);
});

test('tool collections are accessible on desktop and mobile', async ({ page }) => {
  // Axe injects scripts; crawlability is checked separately with JavaScript disabled.
  await page.goto('/');
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const section = page.locator('.home-tool-collections');
    await section.screenshot({ path: `test-results-blog/tool-collections-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      (
        await new AxeBuilder({ page })
          .include('.home-tool-collections')
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
  }
});

test('every homepage has a distinct search description from its PDF editor', async ({
  request,
}) => {
  test.setTimeout(120_000);
  for (const locale of locales) {
    const prefix = locale === 'en' ? '' : `/${locale}`;
    const home = await request.get(prefix || '/');
    const editor = await request.get(`${prefix}/edit-pdf`);
    expect(home.status()).toBe(200);
    expect(editor.status()).toBe(200);
    const description = (html: string) =>
      html.match(/<meta name="description" content="([^"]+)"/)?.[1];
    const homeDescription = description(await home.text());
    const editorDescription = description(await editor.text());
    expect(homeDescription).toBeTruthy();
    expect(editorDescription).toBeTruthy();
    expect(homeDescription, locale).not.toBe(editorDescription);
  }
});

test('translated search pages keep guide discovery and structured data in the chosen language', async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const schemas = async () =>
    (await page.locator('script[type="application/ld+json"]').allTextContents()).map((text) =>
      JSON.parse(text),
    );
  try {
    for (const locale of ['en', 'de', 'ja']) {
      const prefix = locale === 'en' ? '' : `/${locale}`;
      await page.goto(prefix || '/');
      const graph = (await schemas()).find((schema) => schema['@graph'])['@graph'];
      const website = graph.find((node: Record<string, unknown>) => node['@type'] === 'WebSite');
      expect(website.name).toBe('Folio');
      expect(website.alternateName).toBe('folio.example');
      await expect(
        page.locator('.footer-brand a').filter({ hasText: 'folio.example' }),
      ).toHaveAttribute('href', prefix || '/');
      expect(
        graph.find((node: Record<string, unknown>) => node['@type'] === 'WebPage').description,
      ).toBe(await page.locator('meta[name="description"]').getAttribute('content'));
      if (locale === 'en') await expect(page.locator('h1')).toContainText('Free online PDF tools.');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(
        page.locator(`main a[href="${prefix}/guides/choose-a-free-pdf-editor"]`),
      ).toBeVisible();
      await page.goto(`${prefix}/merge-pdf`);
      const links = await page
        .locator('.tool-reading a, #tool-facts a')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')!));
      expect(links.length).toBeGreaterThan(0);
      expect(
        links.every((href) => href.startsWith(`${prefix}/guides/`) || href === `${prefix}/privacy`),
      ).toBe(true);
      await page.goto(`${prefix}/guides`);
      const collection = (await schemas()).find((schema) => schema['@type'] === 'CollectionPage');
      expect(collection.url).toBe(`https://folio.example${prefix}/guides`);
      expect(
        collection.mainEntity.itemListElement.every((item: { url: string }) =>
          item.url.startsWith(`https://folio.example${prefix}/guides/`),
        ),
      ).toBe(true);
      await page.goto(`${prefix}/guides/choose-a-free-pdf-editor`);
      const crumbs = (await schemas()).find((schema) => schema['@type'] === 'BreadcrumbList');
      expect(crumbs.itemListElement.at(-1).item).toBe(
        await page.locator('link[rel="canonical"]').getAttribute('href'),
      );
      await expect(page.locator(`table a[href="${prefix}/merge-pdf"]`)).toBeVisible();
    }
    await page.screenshot({
      path: 'test-results-blog/seo-translated-guide-mobile.png',
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});

test('server-rendered titles omit brand prefixes and suffixes and retain translated wording', async ({
  page,
  request,
}) => {
  test.setTimeout(120_000);
  const cases: [string, string][] = [
    ['/edit-pdf', 'Free Online PDF Editor — No Sign Up'],
    ['/blog', 'PDF Tips & Tutorials'],
    ['/blog?page=2', 'PDF Tips & Tutorials — Page 2'],
    ['/sv/blog', 'PDF-tips och handledningar'],
    ['/blog?q=Portfolio', 'Search PDF articles: Portfolio'],
    ['/admin', 'Super admin'],
    ['/admin/blog/example', 'Post editor'],
    ['/auth/callback', 'Signing In'],
    ['/blog/better-paperwork', 'Better paperwork with Folio'],
    ['/privacy', 'Your Privacy — How Folio Handles Documents'],
    [
      '/guides/does-folio-upload-pdf-files',
      'Does Folio Upload Your PDF? Local Tools vs. Cloud Saving',
    ],
  ];
  for (const locale of locales) {
    const messages = {
      ...JSON.parse(await readFile(`src/lib/i18n/feature-messages/${locale}.json`, 'utf8')),
      ...JSON.parse(await readFile(`src/lib/i18n/site-messages/${locale}.json`, 'utf8')),
    };
    cases.push([
      `${locale === 'en' ? '' : `/${locale}`}/about`,
      messages['About Folio — PDF Tools, Ownership & Editorial Standards'],
    ]);
    cases.push([`${locale === 'en' ? '' : `/${locale}`}/account`, messages['Your Account']]);
    cases.push([`${locale === 'en' ? '' : `/${locale}`}/blog`, messages['PDF Tips & Tutorials']]);
  }
  for (const [path, expected] of cases) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const metadata = await page.evaluate(
      (html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return {
          title: doc.title,
          count: doc.querySelectorAll('title').length,
          openGraph: doc.querySelector('meta[property="og:title"]')?.getAttribute('content'),
          twitter: doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
        };
      },
      await response.text(),
    );
    expect(metadata.count, path).toBe(1);
    expect(metadata.title, path).toBe(expected);
    expect(metadata.openGraph, path).toBe(expected);
    expect(metadata.twitter, path).toBe(expected);
  }
});

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
  expect(await response!.text()).toContain('property="og:title" content="Free Online PDF Tools"');
  await expect(page).toHaveTitle('Free PDF Tools & Online PDF Editor');
  await expect(page.locator('head meta[property="og:title"]')).toHaveCount(1);
  await expect(page.locator('head meta[property="og:title"]')).toHaveAttribute(
    'content',
    'Free Online PDF Tools',
  );
  await expect(page.locator('head meta[name="author"]')).toHaveAttribute('content', 'Folio');
  await expect(page.locator('head meta[name="format-detection"]')).toHaveAttribute(
    'content',
    'telephone=no, address=no, email=no',
  );
  await expect(page.locator('meta[name="twitter:site"], meta[name="twitter:creator"]')).toHaveCount(
    0,
  );
  await expect(page.locator('head link[hreflang="de"]')).toHaveAttribute(
    'href',
    'https://folio.example/de',
  );
  const shareDescription = await page
    .locator('meta[property="og:description"]')
    .getAttribute('content');
  const twitterDescription = await page
    .locator('meta[name="twitter:description"]')
    .getAttribute('content');
  expect(twitterDescription).not.toBe(shareDescription);
  expect(twitterDescription).toContain('All available tools and downloads are free');
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute(
    'content',
    'Free Online PDF Tools — preview card',
  );
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
  for (const locale of locales) {
    const prefix = locale === 'en' ? '' : `/${locale}`;
    for (const path of [prefix || '/', `${prefix}/about`]) {
      const entry = sitemap
        .split('<url>')
        .find((entry) => entry.includes(`<loc>https://folio.example${path}</loc>`));
      expect(entry, path).toContain('<lastmod>2026-10-15</lastmod>');
    }
  }
  for (const tool of tools) {
    expect(sitemap.includes(`<loc>https://folio.example/${tool.slug}</loc>`), tool.slug).toBe(
      tool.available,
    );
    const entry = sitemap
      .split('<url>')
      .find((entry) => entry.includes(`<loc>https://folio.example/${tool.slug}</loc>`));
    expect(entry, tool.slug).toContain(
      `<lastmod>${toolContentUpdated(tool.slug) ?? toolExamples[tool.slug].updated}</lastmod>`,
    );
    // Shared factual corrections are translated; deeper editorial editions remain English.
    const translated = sitemap
      .split('<url>')
      .find((entry) => entry.includes(`<loc>https://folio.example/de/${tool.slug}</loc>`));
    expect(translated).toBeTruthy();
    const translatedUpdate = toolContentUpdated(tool.slug, 'de');
    if (translatedUpdate) expect(translated).toContain(`<lastmod>${translatedUpdate}</lastmod>`);
    else expect(translated).not.toContain('<lastmod>');
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
  await expect(page.locator('meta[name="author"]')).toHaveAttribute('content', 'Iram Shams');
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

test('mobile editing guide exposes the revised steps and preserves reviewed translations', async ({
  page,
  request,
}) => {
  const path = '/guides/how-to-edit-a-pdf-on-mobile';
  const response = await request.get(path);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('How to edit a PDF on Android in your browser');
  expect(html).toContain('How to edit a PDF on iPhone in Safari');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  await expect(page.locator('h1')).toHaveText('How to Edit a PDF on iPhone or Android');
  await expect(page.locator('time')).toHaveAttribute('datetime', '2026-10-07');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    `https://folio.example${path}`,
  );
  const article = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts
        .map((script) => JSON.parse(script.textContent!))
        .find((schema) => schema['@type'] === 'Article'),
    );
  expect(article.datePublished).toBe('2026-09-18');
  expect(article.dateModified).toBe('2026-10-07');
  expect(article.author).toMatchObject({
    '@type': 'Person',
    name: 'Iram Shams',
    email: 'erushbaig@gmail.com',
    url: 'https://folio.example/about#iram-shams',
  });
  await expect(page.locator('meta[name="author"]')).toHaveAttribute('content', 'Iram Shams');
  await expect(page.getByRole('img', { name: 'Iram Shams', exact: true })).toHaveCSS(
    'width',
    '40px',
  );
  const screenshots = page.locator('figure img');
  await expect(screenshots).toHaveCount(2);
  for (const screenshot of await screenshots.all()) {
    await screenshot.scrollIntoViewIfNeeded();
    await expect
      .poll(() => screenshot.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
  }
  const sample = await request.get('/samples/a4-portrait-practice.pdf');
  expect(sample.status()).toBe(200);
  expect(sample.headers()['x-robots-tag']).toBe('noindex');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .include('.article-body')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({ path: 'test-results-blog/mobile-guide-revision.png', fullPage: true });
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(
    sitemap
      .split('<url>')
      .find((entry) => entry.includes(`<loc>https://folio.example${path}</loc>`)),
  ).toContain('<lastmod>2026-10-07</lastmod>');
  await page.goto(`/de${path}`);
  await expect(page.locator('time')).toHaveAttribute('datetime', '2026-10-26');
  expect(
    sitemap
      .split('<url>')
      .find((entry) => entry.includes(`<loc>https://folio.example/de${path}</loc>`)),
  ).toContain('<lastmod>2026-10-26</lastmod>');
  await expect(
    page.getByRole('heading', { name: 'How to edit a PDF on Android in your browser' }),
  ).toHaveCount(0);
});

test('revised guides render practical tables and preserve translated publication dates', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const editions = [
    ['how-to-edit-a-pdf', '2026-10-04', 1],
    ['how-to-convert-pdf-to-images', '2026-09-26', 3],
  ] as const;
  for (const [slug, , tableCount] of editions) {
    await page.goto(`/guides/${slug}`);
    await expect(page.locator('time')).toHaveAttribute('datetime', '2026-10-12');
    await expect(page.locator('article table')).toHaveCount(tableCount);
    await expect(page.getByRole('complementary', { name: 'Key takeaways' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const article = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((scripts) =>
        scripts
          .map((script) => JSON.parse(script.textContent!))
          .find((schema) => schema['@type'] === 'Article'),
      );
    expect(article.dateModified).toBe('2026-10-12');
    const samples = await page
      .locator('article a[href^="/samples/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')!));
    expect(samples.length).toBeGreaterThan(0);
    for (const sample of samples) {
      const response = await request.get(sample);
      expect(response.status()).toBe(200);
      expect(response.headers()['x-robots-tag']).toBe('noindex');
    }
    expect(
      (await new AxeBuilder({ page }).include('article').withTags(['wcag2a', 'wcag2aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({
      path: `test-results-blog/${slug}-revision-mobile.png`,
      fullPage: true,
    });
  }
  // Visiting a translated page persists that language and redirects later English
  // visits. Finish the English scans before inspecting the German editions.
  for (const [slug, previousDate] of editions) {
    await page.goto(`/de/guides/${slug}`);
    await expect(page.locator('time')).toHaveAttribute('datetime', previousDate);
    await expect(page.getByRole('heading', { name: /Practice:/ })).toHaveCount(0);
  }
});

test('guide navigation matches the article metadata', async ({ page }) => {
  await page.goto('/guides/how-to-sign-a-pdf');
  await expect(
    page.getByRole('navigation', { name: 'On this page' }).getByRole('link'),
  ).toHaveCount(6);
  await page
    .getByRole('link', { name: 'Choose Draw, Type or Image for the clearest result', exact: true })
    .click();
  await expect(page).toHaveURL(/#section-2$/);
  await expect(page.locator('time')).toHaveAttribute('datetime', '2026-10-15');
  const schemas = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) => scripts.map((script) => JSON.parse(script.textContent!)));
  const article = schemas.find((schema) => schema['@type'] === 'Article');
  expect(article.dateModified).toBe('2026-10-15');
  expect(article.datePublished).toBe('2026-09-15');
  expect(article.publisher.name).toBe('Folio');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { tools } from '../src/lib/tools';

test('tool directory uses the shared page size and resets pagination when filtering', async ({
  page,
}) => {
  await page.goto('/tools');
  const cards = page.locator('.directory-card');
  const pager = page.getByRole('navigation', { name: 'Tools pagination' });
  await expect(cards).toHaveCount(10);
  const first = await cards.first().getAttribute('href');
  await pager.getByRole('link', { name: 'Next page' }).click();
  await expect(cards.first()).not.toHaveAttribute('href', first!);
  await pager.getByRole('combobox', { name: 'Records per page' }).click();
  await page.getByRole('option', { name: '100 per page', exact: true }).click();
  await expect(cards).toHaveCount(tools.length);
  await page.getByRole('textbox', { name: 'Find a PDF tool' }).fill('merge');
  await page.getByRole('button', { name: 'Search directory' }).click();
  await expect(cards).toHaveCount(2);
  await expect(pager).toContainText('1–2 of 2 records');
  await expect(pager.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  await page.getByRole('link', { name: 'Clear search', exact: true }).click();
  await expect(cards).toHaveCount(tools.length);
});
const art =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="680" viewBox="0 0 1200 680"><rect width="1200" height="680" fill="#dce5ce"/><path d="M0 510L1200 330V680H0Z" fill="#cedaba"/><rect x="335" y="130" width="360" height="435" rx="5" transform="rotate(-8 335 130)" fill="#adb996"/><rect x="375" y="105" width="360" height="435" rx="5" transform="rotate(5 375 105)" fill="#fff9eb"/><g stroke="#94a179" stroke-width="9"><path d="M420 200H670M420 230H590M420 310H660M420 345H650M420 380H610"/></g><rect x="832" y="407" width="85" height="112" rx="8" fill="#b06f51"/><path d="M875 421V215" stroke="#6d8054" stroke-width="8"/><ellipse cx="842" cy="273" rx="35" ry="70" fill="#748b5b" transform="rotate(-30 842 273)"/><ellipse cx="909" cy="246" rx="33" ry="60" fill="#536d43" transform="rotate(27 909 246)"/></svg>';
test('published blog is rendered for search engines, hides drafts and supports persistent reader likes', async ({
  page,
  request,
}) => {
  await page.route('https://images.example.test/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: art }),
  );
  await page.route('**/api/account/access', (route) =>
    route.fulfill({
      json: {
        pro: false,
        admin: false,
        trial: false,
        expiresAt: null,
        cancelAtPeriodEnd: false,
        billingReady: false,
      },
    }),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/blog');
  await expect(page.getByRole('heading', { name: 'PDF tips. Better documents.' })).toBeVisible();
  const listingHtml = await (await request.get('/blog')).text();
  expect(listingHtml.match(/<h1(?:\s|>)/g)).toHaveLength(1);
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(10);
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await page.screenshot({
    path: '/tmp/folio-blog-public-list.png',
    fullPage: true,
    animations: 'disabled',
    caret: 'initial',
  });
  await page.getByRole('textbox', { name: 'Search blog posts' }).fill('Make room');
  await page.getByRole('button', { name: 'Search posts', exact: true }).click();
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
  await page.getByRole('link', { name: 'Make room for better paperwork.', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Make room for better paperwork.',
  );
  await expect(page).toHaveTitle(/Better paperwork with Folio/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://folio.example/blog/better-paperwork',
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(schemas.some((value) => JSON.parse(value)['@type'] === 'BlogPosting')).toBe(true);
  const html = await (await request.get('/blog/better-paperwork')).text();
  expect(html).toContain('Give every document a home.');
  expect((await request.get('/blog/secret-draft')).status()).toBe(404);
  expect((await request.get('/blog/scheduled-story')).status()).toBe(404);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/blog/better-paperwork');
  expect(sitemap).not.toContain('secret-draft');
  expect(sitemap).not.toContain('scheduled-story');
  await page.screenshot({
    path: '/tmp/folio-blog-public-post.png',
    fullPage: true,
    animations: 'disabled',
    caret: 'initial',
  });
  await page.getByRole('link', { name: /Sign in to like this post/ }).click();
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/blog\/better-paperwork$/);
  const like = page.getByRole('button', { name: 'Like this post', exact: true });
  await expect(like).toBeEnabled();
  await like.click();
  await expect(page.getByRole('button', { name: 'Unlike this post', exact: true })).toHaveText(
    '18',
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unlike this post', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Unlike this post', exact: true }).click();
  await expect(like).toHaveText('17');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({
    path: '/tmp/folio-blog-public-mobile.png',
    fullPage: true,
    animations: 'disabled',
    caret: 'initial',
  });
  const results = await new AxeBuilder({ page }).include('main').analyze();
  expect(results.violations).toEqual([]);
});

test('blog pagination renders ten posts and preserves search and category in crawlable links', async ({
  page,
  request,
}) => {
  await page.route('https://images.example.test/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: art }),
  );
  await page.goto('/blog?q=Pagination&category=Pagination+guides');
  const pager = page.getByRole('navigation', { name: 'Blog pagination' });
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(10);
  await expect(pager).toContainText('1–10 of 22 records');
  await expect(pager.getByRole('link', { name: 'Next page' })).toHaveAttribute(
    'href',
    '/blog?q=Pagination&category=Pagination+guides&page=2',
  );
  await pager.getByRole('link', { name: 'Next page' }).click();
  await expect(pager).toContainText('11–20 of 22 records');
  await expect(
    page.getByRole('heading', { name: 'Pagination guide 11', exact: true }),
  ).toBeVisible();
  const response = await request.get('/blog?q=Pagination&category=Pagination+guides&page=3');
  expect(await response.text()).toContain('Pagination guide 22');
  await page.goto('/blog?q=Pagination&category=Pagination+guides&page=3');
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(2);
  await expect(pager.getByRole('button', { name: 'Next page' })).toBeDisabled();
  await pager.getByRole('combobox', { name: 'Records per page' }).click();
  await page.getByRole('option', { name: '25 per page', exact: true }).click();
  await expect(page).toHaveURL(/pageSize=25/);
  expect(new URL(page.url()).searchParams.has('page')).toBe(false);
  await expect(pager).toContainText('1–22 of 22 records');
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(22);
  await expect(pager.getByRole('combobox', { name: 'Records per page' })).toContainText(
    '25 per page',
  );
  await page.getByRole('textbox', { name: 'Search blog posts' }).fill('Pagination guide 22');
  await page.getByRole('button', { name: 'Search posts', exact: true }).click();
  await expect(page).toHaveURL(/category=Pagination\+guides/);
  await expect(page).toHaveURL(/pageSize=25/);
  await expect(pager).toContainText('1–1 of 1 record');
  await page.goto('/blog?q=Pagination&category=Pagination+guides&page=999');
  await expect(page).toHaveURL(/page=3$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(pager.getByText('Page 3 of 3', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

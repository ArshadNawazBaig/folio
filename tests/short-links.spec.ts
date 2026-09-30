import { test, expect } from './fixtures/editor-storage';
import { mockGoogle } from './fixtures/auth';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import type { ShortLink } from '../src/lib/short-links';
import sharp from 'sharp';
import jsQR from 'jsqr';

async function linkFixture(page: Page, pro = false) {
  await mockGoogle(page);
  if (pro)
    await page.route('**/api/account/access', (route) =>
      route.fulfill({
        json: {
          pro: true,
          trial: true,
          expiresAt: null,
          cancelAtPeriodEnd: false,
          billingReady: false,
        },
      }),
    );
  let links: ShortLink[] = [];
  let sequence = 1;
  await page.route('**/api/account/links{,?**,/**}', async (route) => {
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (method === 'GET') {
      const filtered = links.filter((link) =>
        [link.title, link.alias, link.destination].some((value) =>
          value.includes(url.searchParams.get('q') || ''),
        ),
      );
      const size = Number(url.searchParams.get('pageSize') || 10);
      const offset = (Number(url.searchParams.get('page') || 1) - 1) * size;
      return route.fulfill({
        json: {
          links: filtered.slice(offset, offset + size),
          total: filtered.length,
          used: links.length,
          limit: pro ? 1000 : 10,
        },
      });
    }
    const id = url.pathname.split('/').pop();
    if (method === 'DELETE') {
      links = links.filter((link) => link.id !== id);
      return route.fulfill({ status: 204 });
    }
    const body = route.request().postDataJSON();
    if (method === 'PATCH') {
      const link = links.find((link) => link.id === id)!;
      Object.assign(link, body);
      return route.fulfill({ json: { link } });
    }
    if (body.alias === 'taken')
      return route.fulfill({
        status: 409,
        json: { error: 'This alias is already reserved. Choose a different one.' },
      });
    const alias = body.alias || `random-link-${sequence}`;
    const link: ShortLink = {
      ...body,
      alias,
      id: `00000000-0000-4000-8000-${String(sequence++).padStart(12, '0')}`,
      custom: !!body.alias,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      shortUrl: `http://127.0.0.1:3001/s/${alias}`,
    };
    links.unshift(link);
    return route.fulfill({ status: 201, json: { link } });
  });
  return {
    seed: (count: number) => {
      links = Array.from({ length: count }, (_, index) => ({
        id: `00000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`,
        alias: `saved-${index}`,
        title: `Saved campaign ${index}`,
        destination: `https://example.com/campaign/${index}`,
        shortUrl: `http://127.0.0.1:3001/s/saved-${index}`,
        custom: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    },
  };
}

test('free short links save to My links, copy, produce scannable QR downloads, and delete', async ({
  page,
  context,
}) => {
  await linkFixture(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/url-shortener');
  await expect(page.getByRole('heading', { name: 'URL shortener.' })).toBeVisible();
  await expect(page.getByLabel('Destination URL', { exact: true })).toBeDisabled();
  await page.getByRole('link', { name: 'Sign in to shorten' }).click();
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/url-shortener$/);
  await page
    .getByLabel('Destination URL', { exact: true })
    .fill('https://example.com/a-long-document-url');
  await page.getByLabel('Title (optional)').fill('Project launch');
  await expect(page.getByLabel('Custom alias')).toBeDisabled();
  await page.getByRole('button', { name: 'Shorten link', exact: true }).click();
  const result = page.getByRole('region', { name: 'New short link' });
  await expect(result).toContainText('Your link is ready and saved.');
  await result.getByRole('button', { name: 'Copy link' }).click();
  await expect(result.getByRole('button', { name: 'Copied!' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'http://127.0.0.1:3001/s/random-link-1',
  );
  await result.getByRole('button', { name: 'Generate QR' }).click();
  await expect(result.getByRole('img', { name: /QR code for/ })).toBeVisible();
  for (const format of ['PNG', 'SVG']) {
    const downloaded = page.waitForEvent('download');
    await result.getByRole('link', { name: format, exact: true }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toBe(`folio-random-link-1.${format.toLowerCase()}`);
    const { data, info } = await sharp((await download.path())!)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(
      'http://127.0.0.1:3001/s/random-link-1',
    );
  }
  await page.screenshot({ path: 'test-results-auth/short-links-desktop.png', fullPage: true });
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
  await page.getByRole('link', { name: 'Open My links' }).click();
  await expect(
    page
      .getByRole('navigation', { name: 'Dashboard navigation' })
      .getByRole('link', { name: 'My links' }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('article').filter({ hasText: 'Project launch' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Edit Project launch', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Destination URL')).toBeDisabled();
  await dialog.getByLabel('Title', { exact: true }).fill('Renamed launch');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('article').filter({ hasText: 'Renamed launch' })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  await page.getByRole('button', { name: 'Generate QR' }).click();
  await expect(page.getByRole('img', { name: /QR code for/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results-auth/short-links-mobile.png', fullPage: true });
  expect((await new AxeBuilder({ page }).include('main').analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Delete Renamed launch' }).click();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Delete Renamed launch' }).click();
  await dialog.getByRole('button', { name: 'Delete link', exact: true }).click();
  await expect(page.getByText('Your first link starts above.')).toBeVisible();
  await expect(
    page.getByText('Link deleted. Its address and QR code no longer work.'),
  ).toBeVisible();
});

test('Pro supports custom aliases, destination changes, search, and pagination', async ({
  page,
}) => {
  const fixture = await linkFixture(page, true);
  fixture.seed(12);
  await page.goto('/account?next=%2Fdashboard%3Fview%3Dlinks');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/view=links/);
  const pager = page.getByRole('navigation', { name: 'Saved links pagination' });
  await expect(pager).toContainText('1–10 of 12 records');
  await pager.getByRole('button', { name: 'Next page' }).click();
  await expect(pager).toContainText('11–12 of 12 records');
  await page.getByRole('searchbox', { name: 'Search saved links' }).fill('campaign 4');
  await expect(pager).toContainText('1–1 of 1 record');
  await page.getByRole('searchbox', { name: 'Search saved links' }).fill('');
  await page.getByLabel('Destination URL', { exact: true }).fill('https://example.com/launch');
  await page.getByLabel('Custom alias').fill('taken');
  await page.getByRole('button', { name: 'Shorten link', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'This alias is already reserved.',
  );
  await expect(page.getByLabel('Destination URL', { exact: true })).toHaveValue(
    'https://example.com/launch',
  );
  await page.getByLabel('Custom alias').fill('my-launch');
  await page.getByLabel('Title (optional)').fill('Product launch');
  await page.getByRole('button', { name: 'Shorten link', exact: true }).click();
  await expect(page.getByRole('region', { name: 'New short link' })).toContainText('/s/my-launch');
  await page.getByRole('button', { name: 'Edit Product launch', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Destination URL').fill('https://example.com/new-launch');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('article').filter({ hasText: 'Product launch' })).toContainText(
    'https://example.com/new-launch',
  );
  await expect(page.getByRole('region', { name: 'New short link' })).toContainText('/s/my-launch');
  await page.goto('/pricing');
  await expect(
    page.getByText('10 saved short links with random aliases', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('1,000 saved short links with custom aliases', { exact: true }),
  ).toBeVisible();
});

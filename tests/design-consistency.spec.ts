import { test, expect } from './fixtures/editor-storage';
import type { Locator, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockGoogle } from './fixtures/auth';
import { tools } from '../src/lib/tools';
import { DEFAULT_CATALOG, DEFAULT_SETTINGS } from '../src/lib/platform';
import { FREE_STORAGE_LIMIT } from '../src/lib/cloud-types';

async function fitsPage(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function fixedDialog(page: Page, dialog: Locator, bodySelector = '.dialog-body') {
  await expect(dialog).toBeVisible();
  const box = (await dialog.boundingBox())!;
  expect(box.height).toBeLessThanOrEqual(page.viewportSize()!.height * 0.8 + 2);
  const header = dialog.locator('header'),
    footer = dialog.locator('footer');
  const before = { header: await header.boundingBox(), footer: await footer.boundingBox() };
  await dialog.locator(bodySelector).evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect(await header.boundingBox()).toEqual(before.header);
  expect(await footer.boundingBox()).toEqual(before.footer);
  for (const region of [header, footer]) {
    const bounds = (await region.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(box.y);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(box.y + box.height + 1);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
}

for (const width of [1440, 390]) {
  test(`design: public page families fit the viewport and search keeps controls visible at ${width}px`, async ({
    page,
  }, info) => {
    await mockGoogle(page);
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '/',
      '/tools',
      '/convert',
      '/forms',
      '/pricing',
      '/support',
      '/account',
      '/about',
      '/privacy',
      '/guides',
      '/blog',
      ...tools.map((t) => `/${t.slug}`),
    ]) {
      await page.goto(path);
      await expect(page.locator('.header-account[aria-busy="true"]')).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await fitsPage(page);
      if (['/support', '/pricing', '/account', '/protect-pdf'].includes(path)) {
        expect(
          (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
            .violations,
          path,
        ).toEqual([]);
        await page.screenshot({
          path: info.outputPath(`${path.slice(1)}-${width}.png`),
          fullPage: true,
        });
      }
    }
    await page.setViewportSize({ width, height: 640 });
    await page.getByRole('button', { name: 'Search tools', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('textbox', { name: 'Search PDF tools' })).toBeFocused();
    const header = dialog.locator('.search-dialog-top'),
      footer = dialog.locator('.search-dialog-footer');
    const position = await footer.boundingBox();
    await dialog.locator('.search-results').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    expect(await footer.boundingBox()).toEqual(position);
    await expect(header).toBeInViewport();
    await expect(footer).toBeInViewport();
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.height).toBeLessThanOrEqual(640 * 0.8 + 2);
    await page.screenshot({ path: info.outputPath(`search-${width}.png`) });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
}

test('design: admin form notices, navigation and long confirmation dialogs remain consistent', async ({
  page,
}, info) => {
  await mockGoogle(page, true);
  await page.route('**/api/admin?**', (route) =>
    route.fulfill({
      json: {
        catalog: DEFAULT_CATALOG,
        settings: DEFAULT_SETTINGS,
        billingReady: false,
        userDeletionReady: true,
        overview: { users: 1, paid: 0, trials: 0, operations: 0, suspended: 0, openTickets: 0 },
        users: {
          total: 1,
          rows: [
            {
              id: '00000000-0000-4000-8000-000000000002',
              email: 'a-very-long-account-name-for-layout-review@example.test',
              created_at: new Date().toISOString(),
              suspended: false,
              is_admin: false,
              grant_until: null,
              deletion_pending: false,
            },
          ],
        },
      },
    }),
  );
  await page.route('**/api/admin/blog?**', (route) =>
    route.fulfill({ json: { posts: [], total: 0 } }),
  );
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 740 });
    await page.getByRole('button', { name: 'Pricing plans', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Pricing plans', exact: true })).toBeVisible();
    await expect(page.locator('main[data-skeleton-loading="true"]')).toHaveCount(0);
    const action = page.getByRole('button', { name: 'Review & publish pricing' });
    await expect(action).toBeDisabled();
    const note = page.locator('#pricing-connection-note');
    await note.scrollIntoViewIfNeeded();
    const a = (await action.boundingBox())!,
      n = (await note.boundingBox())!;
    expect(a.y - n.y - n.height).toBeGreaterThanOrEqual(15);
    expect(n.x).toBeCloseTo(a.x, 0);
    await fitsPage(page);
    await page.screenshot({ path: info.outputPath(`admin-pricing-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Users', exact: true }).click();
    await page.getByRole('button', { name: 'Delete user', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await fixedDialog(page, dialog);
    await expect(
      dialog.getByRole('button', { name: 'Permanently delete user', exact: true }),
    ).toBeDisabled();
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({ path: info.outputPath(`admin-confirm-${width}.png`) });
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  await page.goto('/admin/blog');
  const navigation = page.getByRole('navigation', { name: 'Admin navigation' });
  await expect(navigation.getByRole('link')).toHaveCount(8);
  await expect(navigation.getByRole('link', { name: 'Blog posts' })).toBeInViewport();
  await navigation.getByRole('link', { name: 'Site settings' }).click();
  await expect(page.getByRole('heading', { name: 'Site settings', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Site settings', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('design: dashboard navigation and file/account dialogs fit narrow mobile screens', async ({
  page,
}, info) => {
  await mockGoogle(page);
  await page.route('**/api/account/files', (route) =>
    route.fulfill({
      json: {
        files: [
          {
            id: '00000000-0000-4000-8000-000000000002',
            name: 'Client proposal with a detailed document name.pdf',
            size: 12345,
            status: 'ready',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        storage: {
          used: 12345,
          limit: FREE_STORAGE_LIMIT,
          available: FREE_STORAGE_LIMIT - 12345,
          full: false,
          recovery: [],
        },
      },
    }),
  );
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/dashboard?view=files');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.getByRole('button', { name: /^Rename Client proposal/ }).click();
  const dialog = page.getByRole('dialog');
  await fixedDialog(page, dialog);
  await page.screenshot({ path: info.outputPath('file-rename-mobile.png') });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.goto('/dashboard?view=settings');
  const active = page
    .getByRole('navigation', { name: 'Dashboard navigation' })
    .getByRole('link', { name: 'Account settings', exact: true });
  await expect(active).toBeInViewport();
  await page.getByRole('button', { name: 'Sign out other sessions', exact: true }).click();
  await fixedDialog(page, dialog);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: info.outputPath('account-confirm-mobile.png') });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await fitsPage(page);
});

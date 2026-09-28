import { test, expect } from './fixtures/editor-storage';
import type { Locator, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockGoogle } from './fixtures/auth';
import { tools } from '../src/lib/tools';
import { DEFAULT_CATALOG, DEFAULT_SETTINGS } from '../src/lib/platform';
import { FREE_STORAGE_LIMIT } from '../src/lib/cloud-types';
import { createSample } from '../src/lib/sample';

async function fitsPage(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const clippedActions = await page
    .locator('.button, .text-link, .header-account, nav[aria-label="Account navigation"] > a')
    .evaluateAll((actions) =>
      actions
        .filter((action) => {
          const box = action.getBoundingClientRect();
          if (!box.width || !box.height) return false;
          return (
            action.scrollWidth > action.clientWidth + 1 ||
            [...action.querySelectorAll('svg')].some((icon) => {
              const bounds = icon.getBoundingClientRect();
              return bounds.width > 0 && (bounds.left < box.left || bounds.right > box.right + 1);
            })
          );
        })
        .map((action) => action.getAttribute('aria-label') || action.textContent?.trim()),
    );
  expect(clippedActions, `Clipped button labels or icons on ${page.url()}`).toEqual([]);
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

for (const width of [1440, 390, 320]) {
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
      if (['/', '/tools', '/support', '/pricing', '/account', '/protect-pdf'].includes(path)) {
        expect(
          (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
            .violations,
          path,
        ).toEqual([]);
        await page.screenshot({
          path: info.outputPath(`${path.slice(1) || 'home'}-${width}.png`),
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

test('design: home toolkit search, task filters and upload validation work on mobile', async ({
  page,
}) => {
  await mockGoogle(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toolkit = page.getByRole('region', { name: 'What would you like to do?' });
  const search = toolkit.getByRole('searchbox', { name: 'Find a PDF tool' });
  await search.fill('smaller');
  await expect(toolkit.getByRole('link', { name: /^Compress PDF/ })).toBeVisible();
  await expect(toolkit.getByRole('link', { name: /^Merge PDF/ })).toHaveCount(0);
  await search.fill('a tool that does not exist');
  await expect(toolkit.getByText('No tools found.', { exact: true })).toBeVisible();
  await toolkit.getByRole('button', { name: 'Reset filters' }).click();
  await expect(search).toHaveValue('');
  await toolkit.getByRole('button', { name: 'Organize', exact: true }).click();
  await expect(toolkit.getByRole('link', { name: /^Rotate PDF/ })).toBeVisible();
  await expect(toolkit.getByRole('link', { name: /^Image to PDF/ })).toHaveCount(0);
  await toolkit.getByRole('button', { name: 'Convert', exact: true }).click();
  await expect(toolkit.getByRole('link', { name: /^Image to PDF/ })).toBeVisible();
  await expect(toolkit.getByRole('link', { name: /^Merge PDF/ })).toHaveCount(0);
  await page
    .locator('.home-upload input[type="file"]')
    .setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Not a PDF') });
  await expect(page.locator('.home-upload').getByRole('alert')).toContainText('Choose a PDF');
  await fitsPage(page);
  await toolkit.getByRole('link', { name: /^Image to PDF/ }).click();
  await expect(page).toHaveURL(/\/image-to-pdf$/);
});

test('design: tool search opens on demand, restores focus and navigates after reopening', async ({
  page,
}) => {
  await mockGoogle(page);
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Find a PDF tool', exact: true });
  await expect(dialog).toBeHidden();
  await page.keyboard.press('ControlOrMeta+k');
  const input = dialog.getByRole('textbox', { name: 'Search PDF tools' });
  await expect(input).toBeFocused();
  await input.fill('signature');
  await expect(dialog.getByRole('link', { name: /^Signature generator/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Search tools', exact: true }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('signature');
  await dialog.getByRole('link', { name: /^Signature generator/ }).click();
  await expect(page).toHaveURL(/\/signature-generator$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Signature generator');
  await expect(dialog).toBeHidden();
});

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
  await page.route('**/api/account/files{,?**}', (route) =>
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
  await page.goto('/account?next=%2Fdashboard%3Fview%3Dfiles');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 740 });
    const toolsLink = page.getByRole('link', { name: 'All PDF tools', exact: true });
    await expect(toolsLink).toBeInViewport();
    await toolsLink.hover();
    await fitsPage(page);
    await page
      .getByRole('banner', { name: 'Workspace navigation' })
      .screenshot({ path: info.outputPath(`dashboard-navbar-${width}.png`) });
  }
  await page.setViewportSize({ width: 320, height: 640 });
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

test('design: editor save and download actions fit desktop, tablet and mobile', async ({
  page,
}, info) => {
  await mockGoogle(page);
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas').first()).toBeVisible();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 740 });
    await expect(page.getByRole('button', { name: 'Save to cloud', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeInViewport();
    await fitsPage(page);
    await page
      .locator('.editor-header')
      .screenshot({ path: info.outputPath(`editor-actions-${width}.png`) });
  }
});

test('design: workspace welcome fits every screen, validates uploads and opens its sample', async ({
  page,
}, info) => {
  await mockGoogle(page);
  await page.goto('/workspace');
  const welcome = page.locator('.editor-empty');
  const choose = welcome.getByRole('button', { name: 'Choose a file', exact: true });
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await welcome.evaluate((element) => {
      element.scrollTop = 0;
    });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Your PDF.Your finishing touches.',
    );
    await expect(choose).toBeInViewport();
    await expect(page.getByRole('link', { name: 'My files', exact: true })).toBeInViewport();
    await fitsPage(page);
    await page.screenshot({ path: info.outputPath(`workspace-welcome-${width}.png`) });
    if (width === 1440 || width === 320) {
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
    }
  }
  const fileChooser = page.waitForEvent('filechooser');
  await choose.click();
  await (
    await fileChooser
  ).setFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Not a PDF') });
  await expect(welcome.getByRole('alert')).toHaveText('Choose a PDF smaller than 50 MB.');
  const sample = welcome.getByRole('button', { name: 'Try a sample document', exact: true });
  await sample.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('workspace-welcome-sample-mobile.png') });
  await sample.click();
  await expect(page.locator('.editable-page canvas').first()).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Document name' })).toHaveValue(
    'Studio North — Proposal.pdf',
  );
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeEnabled();
  await expect(welcome).toHaveCount(0);
});

test('design: workspace welcome navigates to files and opens a dropped PDF', async ({ page }) => {
  await mockGoogle(page);
  await page.goto('/workspace');
  await page.getByRole('link', { name: 'My files', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\?view=files$/);
  await page.goto('/workspace');
  const bytes = await createSample();
  const transfer = await page.evaluateHandle((data) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([new Uint8Array(data)], 'Dropped proposal.pdf', { type: 'application/pdf' }),
    );
    return transfer;
  }, Array.from(bytes));
  await page
    .locator('.editor-empty .upload-area')
    .dispatchEvent('drop', { dataTransfer: transfer });
  await expect(page.locator('.editable-page canvas').first()).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Document name' })).toHaveValue(
    'Dropped proposal.pdf',
  );
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeEnabled();
  await transfer.dispose();
});

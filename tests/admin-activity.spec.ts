import { test, expect } from './fixtures/editor-storage';
import AxeBuilder from '@axe-core/playwright';
import { mockGoogle } from './fixtures/auth';
import { DEFAULT_CATALOG, DEFAULT_SETTINGS, type AuditEntry } from '../src/lib/platform';

test.use({ locale: 'en-GB', timezoneId: 'Asia/Karachi' });

test('recorded activity shows readable records while preserving details, pagination and mobile access', async ({
  page,
}) => {
  await mockGoogle(page, true);
  const rows: AuditEntry[] = Array.from({ length: 12 }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 100).padStart(12, '0')}`,
    actor_id: '00000000-0000-4000-8000-000000000001',
    action: i === 1 ? 'blog.create' : 'blog.publish',
    target: `00000000-0000-4000-8000-${String(i + 200).padStart(12, '0')}`,
    detail: {
      title:
        i === 0
          ? 'How to Compress Images to a File Size Limit Without Guessing'
          : `A helpful article about documents ${i + 1}`,
      version: i + 1,
    },
    created_at: i < 3 ? `2026-09-28T13:${23 - i}:39Z` : `2026-09-27T12:${59 - i}:00Z`,
  }));
  rows[3] = {
    ...rows[3],
    action: 'support.update',
    detail: { status: 'resolved', priority: 'normal', replyAdded: true },
  };
  rows[4] = {
    ...rows[4],
    action: 'subscription.request',
    target: 'lemon_1234',
    detail: {
      completed: false,
      reason: 'Requested account change',
      fingerprint: 'recorded-fingerprint',
    },
  };
  rows[5] = {
    ...rows[5],
    action: 'settings.update',
    actor_id: null,
    target: 'platform',
    detail: { maintenance: false, purchasesEnabled: true },
  };
  let records = rows;
  let adminWrites = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/admin' && request.method() !== 'GET')
      adminWrites++;
  });
  await page.route('**/api/admin?**', async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const size = Number(params.get('pageSize') || 10);
    const start = (Number(params.get('page') || 1) - 1) * size;
    await route.fulfill({
      json: {
        catalog: DEFAULT_CATALOG,
        settings: DEFAULT_SETTINGS,
        billingReady: false,
        overview: { users: 1, paid: 0, trials: 0, operations: 0, suspended: 0, openTickets: 0 },
        audit: records.slice(start, start + size),
        auditTotal: records.length,
      },
    });
  });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  const log = page.getByRole('region', { name: 'Recorded activity', exact: true });
  const article = log.getByRole('link', {
    name: 'How to Compress Images to a File Size Limit Without Guessing',
  });
  await expect(article).toBeVisible();
  await expect(article).toHaveAttribute('href', `/admin/blog/${rows[0].target}`);
  await page.getByRole('button', { name: 'Activity log', exact: true }).click();
  await expect(article).toBeVisible();
  await expect(log.getByRole('heading', { level: 3 }).first()).toContainText('28 September 2026');
  const first = log.locator('li').first();
  await expect(first.locator('time')).toHaveText('18:23');
  await expect(first.getByText('You', { exact: true })).toBeVisible();
  await expect(first.getByText(rows[0].target, { exact: true })).not.toBeVisible();
  await expect(log.getByText('Requested', { exact: true })).toBeVisible();
  await expect(log.getByText('Actor not recorded')).toBeVisible();
  await first.locator('summary').first().focus();
  await page.keyboard.press('Enter');
  await expect(first.getByText('Version', { exact: true })).toBeVisible();
  await expect(first.getByText(rows[0].target, { exact: true })).toBeVisible();
  await first.getByText('Original data', { exact: true }).click();
  await expect(first.locator('pre')).toHaveText(JSON.stringify(rows[0].detail, null, 2));
  await first.locator('summary').first().click();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width !== 320) await log.screenshot({ path: `/tmp/folio-activity-${width}.png` });
  }
  await first.locator('summary').first().click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  const pager = page.getByRole('navigation', { name: 'Activity pagination' });
  await pager.getByRole('button', { name: 'Next page' }).click();
  await expect(pager).toContainText('11–12 of 12 records');
  await expect(log.locator('li')).toHaveCount(2);
  records = [];
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(log.getByRole('heading', { name: 'No activity yet' })).toBeVisible();
  expect(adminWrites).toBe(0);
});

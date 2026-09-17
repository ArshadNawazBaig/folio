import { test, expect } from './fixtures/editor-storage';
import AxeBuilder from '@axe-core/playwright';
import { createSample } from '../src/lib/sample';
import { DEFAULT_CATALOG } from '../src/lib/platform';
test('anyone can edit and preview their PDF; payment appears only at download and guest edits stay in the open tab', async ({
  page,
  request,
}) => {
  const source = Buffer.from(await createSample());
  const paidRequests: string[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/api/pro/pdf')) paidRequests.push(r.url());
  });
  await page.goto('/edit-pdf-text');
  await expect(page.getByRole('button', { name: 'Choose your PDF' })).toBeEnabled();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'My proposal.pdf', mimeType: 'application/pdf', buffer: source });
  await expect(page.locator('.pro-editable-page canvas')).toBeVisible();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Upload for text editing' }).click();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await page.getByRole('textbox', { name: 'Replacement text' }).fill('My new title');
  await page.getByRole('combobox', { name: 'Replacement font' }).click();
  await page.getByRole('option', { name: 'Courier', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Size', exact: true }).fill('24');
  await page.getByLabel('Color', { exact: true }).fill('#334455');
  expect(await page.locator('.pro-workspace').innerText()).not.toMatch(
    /\b(pro|premium|upgrade|subscription)\b/i,
  );
  const preview = page.waitForResponse((r) => r.url().endsWith('/api/pro/preview'));
  await page.getByRole('button', { name: 'Update PDF preview', exact: true }).click();
  const pixels = await (await preview).json();
  expect(pixels.preview).toBeTruthy();
  expect(pixels.bytes).toBeUndefined();
  await expect(page.locator('.pro-rendered-preview')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Replacement font' })).toContainText('Courier');
  await expect(page.getByRole('spinbutton', { name: 'Size', exact: true })).toHaveValue('24');
  await expect(page.getByLabel('Color', { exact: true })).toHaveValue('#334455');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.route('**/api/billing/plans', (route) =>
    route.fulfill({
      json: {
        catalog: DEFAULT_CATALOG,
        ready: true,
        plans: [
          { id: 'trial', amount: 100, currency: 'usd', label: '$1' },
          { id: 'month', amount: 2500, currency: 'usd', label: '$25' },
        ],
      },
    }),
  );
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const gate = page.getByRole('dialog');
  await expect(gate).toBeVisible();
  await expect(
    gate.getByText('Downloading those changes requires a premium plan.', { exact: false }),
  ).toBeVisible();
  await expect(gate.getByText('Keep this tab open', { exact: false })).toBeVisible();
  await expect(gate.locator('.plan-price')).toHaveText('$1 for 7 days');
  await expect(gate.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(gate.getByRole('button', { name: 'I’ve paid — download my PDF' })).toBeHidden();
  await expect(gate.getByRole('alert')).toBeHidden();
  expect(paidRequests).toEqual([]);
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    accessibility.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page.screenshot({ path: '/tmp/folio-pro/download-paywall.png', fullPage: true });
  await gate.getByRole('button', { name: 'Keep editing', exact: true }).last().click();
  await expect(page.getByRole('textbox', { name: 'Replacement text' })).toHaveValue('My new title');
  expect(
    await page.evaluate(async () => (await indexedDB.databases()).map((db) => db.name)),
  ).not.toContain('folio-pro-draft');
  // Neither the public preview API nor cookies can export a modified user PDF.
  for (const operation of ['edit', 'protect']) {
    const job =
      operation === 'protect'
        ? { operation, password: 'password123' }
        : {
            operation,
            changes: [
              {
                id: '0:0',
                original: 'A place to',
                text: 'Edited',
                font: 'Helvetica',
                size: 12,
                color: '#000000',
              },
            ],
          };
    const response = await request.post('/api/pro/preview', {
      multipart: {
        file: { name: 'test.pdf', mimeType: 'application/pdf', buffer: source },
        job: JSON.stringify(job),
      },
    });
    expect(response.status()).toBe(400);
  }
  expect(
    (
      await request.post('/api/pro/pdf', { headers: { Cookie: 'pro=true' }, data: { pro: true } })
    ).status(),
  ).toBe(401);
});
test('password setup is free, mismatch errors appear before payment, and checkout preserves the fields', async ({
  page,
}) => {
  await page.goto('/protect-pdf');
  await page.locator('input[type=file]').setInputFiles({
    name: 'private.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await createSample()),
  });
  await page.getByLabel('Opening password', { exact: true }).fill('my-secret-123');
  await page.getByLabel('Confirm password').fill('different-123');
  await page.getByRole('button', { name: 'Protect & download', exact: true }).click();
  await expect(page.locator('.error-message[role=alert]')).toContainText('do not match');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByLabel('Confirm password').fill('my-secret-123');
  expect(await page.locator('#main').innerText()).not.toMatch(
    /\b(pro|premium|upgrade|subscription)\b/i,
  );
  await page.getByRole('button', { name: 'Protect & download', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Keep editing', exact: true })
    .last()
    .click();
  await expect(page.getByLabel('Opening password', { exact: true })).toHaveValue('my-secret-123');
});
test('admin sections stay accessible and reject unauthenticated mutation access', async ({
  page,
  request,
}) => {
  await page.goto('/admin');
  await expect(page.getByText('Sign in with your super admin account.')).toBeVisible();
  await page.screenshot({ path: '/tmp/folio-pro/admin-overview.png', fullPage: true });
  for (const section of [
    'Overview',
    'Users',
    'Subscriptions',
    'Pricing plans',
    'Support inbox',
    'Site settings',
    'Activity log',
  ]) {
    await page
      .getByRole('navigation', { name: 'Admin navigation' })
      .getByRole('button', { name: section, exact: true })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: section, exact: true })).toBeVisible();
    const violations = (
      await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    ).violations;
    expect(
      violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      section,
    ).toEqual([]);
  }
  await page.getByRole('button', { name: 'Pricing plans', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review & publish pricing' })).toBeDisabled();
  await page.screenshot({ path: '/tmp/folio-pro/admin-pricing.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.screenshot({ path: '/tmp/folio-pro/admin-mobile.png', fullPage: true });
  for (const section of ['Users', 'Pricing plans', 'Support inbox', 'Site settings']) {
    await page.getByRole('button', { name: section, exact: true }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      section,
    ).toBe(true);
  }
  for (const endpoint of ['/api/admin', '/api/support']) {
    expect(
      (await request.get(endpoint, { headers: { Cookie: 'role=super_admin' } })).status(),
    ).toBe(401);
  }
  expect(
    (
      await request.post('/api/admin', {
        data: { action: 'settings', settings: { maintenance: true } },
        headers: { Cookie: 'role=super_admin' },
      })
    ).status(),
  ).toBe(401);
  for (const route of ['/admin', '/support', '/maintenance'])
    expect((await request.get(route)).headers()['x-robots-tag']).toBe('noindex, nofollow');
});
test('pricing refreshes published terms and support never reports a failed submission as sent', async ({
  page,
}) => {
  await page.route('**/api/billing/plans', (r) =>
    r.fulfill({
      json: {
        plans: [],
        catalog: {
          ...DEFAULT_CATALOG,
          version: 'new',
          monthlyAmount: 3000,
          trialAmount: 200,
          trialDays: 10,
        },
        ready: false,
      },
    }),
  );
  await page.goto('/pricing');
  await expect(page.locator('.price-card.featured .plan-price')).toHaveText('$2 for 10 days');
  await expect(page.locator('.plan-renewal').filter({ hasText: 'Then $30/month' })).toBeVisible();
  await page.goto('/support');
  await page.route('**/api/support', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 503,
          json: { error: 'Support is temporarily unavailable. Please retry.' },
        })
      : route.continue(),
  );
  await page.getByLabel('Your name').fill('Test Person');
  await page.getByLabel('Email address').fill('person@example.test');
  await page.getByLabel('Subject', { exact: true }).fill('Help with an export');
  await page
    .getByRole('textbox', { name: 'Message', exact: true })
    .fill('My PDF export needs a little help.');
  await page.getByRole('button', { name: 'Send inquiry' }).click();
  await expect(page.locator('.error-message[role=alert]')).toContainText(
    'Support is temporarily unavailable. Please retry.',
  );
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(
    'My PDF export needs a little help.',
  );
  await expect(page.getByText('Your inquiry was received.', { exact: false })).not.toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});

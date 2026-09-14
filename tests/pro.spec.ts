import { test, expect } from './fixtures/editor-storage';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
test('tool discovery and workspaces show ordinary tools without upgrade labels', async ({
  page,
}) => {
  for (const route of [
    '/',
    '/tools',
    '/edit-pdf-text',
    '/protect-pdf',
    '/translate-pdf',
    '/pdf-to-word',
    '/pdf-to-excel',
    '/pdf-to-powerpoint',
    '/workspace?sample=proposal',
  ]) {
    await page.goto(route);
    await expect(page.locator('#main')).toBeVisible();
    expect(await page.locator('#main').innerText(), route).not.toMatch(
      /\b(pro|premium|upgrade|subscription)\b/i,
    );
    await expect(page.locator('.pro-badge')).toHaveCount(0);
    await expect(page.locator('.download-gate')).not.toBeVisible();
    await expect(page.locator('#main a[href="/pricing"]')).toHaveCount(0);
  }
  await page.goto('/tools');
  await page.getByRole('button', { name: 'Search tools', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search PDF tools' }).fill('text editor');
  const result = page.locator('.search-results').getByRole('link', { name: /PDF text editor/ });
  await expect(result).toBeVisible();
  expect(await result.innerText()).not.toMatch(/\b(pro|premium)\b/i);
  await result.click();
  await expect(page).toHaveURL(/\/edit-pdf-text$/);
  await expect(page.getByRole('button', { name: 'Choose your PDF' })).toBeEnabled();
});

test('the text editor sample opens a user PDF without visiting pricing', async ({ page }) => {
  await page.goto('/edit-pdf-text?demo=1');
  await expect(page.locator('.pro-editable-page canvas')).toBeVisible();
  const fileChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Use your own PDF' }).click();
  const { createSample } = await import('../src/lib/sample');
  await (
    await fileChooser
  ).setFiles({
    name: 'My document.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await createSample()),
  });
  await expect(page.locator('.pro-workspace-bar')).toContainText('My document.pdf');
  await expect(page.getByRole('button', { name: 'Upload for text editing' })).toBeEnabled();
  await expect(page.locator('.download-gate')).not.toBeVisible();
  await expect(page).toHaveURL(/\/edit-pdf-text/);
});

test('pricing publishes the $1 introductory week and $25 monthly renewal before checkout', async ({
  page,
  request,
}) => {
  const html = await (await request.get('/pricing')).text();
  expect(html).toContain('$1 USD today for 7 days, then $25 USD per month automatically');
  expect(html).toContain('Folio Pro Pricing — $25/Month');
  await page.goto('/pricing');
  const card = page.locator('.price-card.featured');
  await expect(card.locator('.plan-price')).toHaveText('$1 for 7 days');
  await expect(card.getByText('Then $25/month. All prices in USD.')).toBeVisible();
  await expect(card.getByRole('button', { name: 'Checkout not available yet' })).toBeDisabled();
  await page.getByRole('button', { name: 'Monthly', exact: true }).click();
  await expect(card.locator('.plan-price')).toHaveText('$25 / month');
  await expect(
    card.getByText('$25 USD per month, starting today.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yearly', exact: true })).toHaveCount(0);
  // Configuration can enable sign-in, but it cannot bypass authentication.
  await page.route('**/api/billing/plans', (route) =>
    route.fulfill({
      json: {
        ready: true,
        plans: [
          { id: 'trial', amount: 100, currency: 'usd', label: '$1' },
          { id: 'month', amount: 2500, currency: 'usd', label: '$25' },
        ],
      },
    }),
  );
  await page.reload();
  await expect(card.getByRole('link', { name: 'Sign in to start for $1' })).toBeVisible();
  await page.getByRole('button', { name: 'Monthly', exact: true }).click();
  await expect(card.getByRole('link', { name: 'Sign in to subscribe' })).toBeVisible();
});
test('original text mode stays in the editor and preserves free annotation downloads', async ({
  page,
}) => {
  let uploaded = false;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/pro/pdf')) uploaded = true;
  });
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  await page.getByRole('textbox', { name: 'Your text', exact: true }).fill('Keep this note');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await expect(page).toHaveURL(/\/workspace\?cloud=[a-f0-9-]+$/);
  await expect(
    page.getByRole('button', { name: 'Edit text: A place to', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.annotation-text')).toContainText('Keep this note');
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const bytes = new Uint8Array(await readFile((await (await event).path())!));
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: bytes, useSystemFonts: true });
  const content = await (await (await task.promise).getPage(1)).getTextContent();
  expect(content.items.map((item) => ('str' in item ? item.str : '')).join(' ')).toContain(
    'Keep this note',
  );
  await task.destroy();
  expect(uploaded).toBe(false);
});
test('Pro warns before navigating away from undownloaded edits', async ({ page }) => {
  await page.goto('/edit-pdf-text?demo=1');
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await page.getByRole('textbox', { name: 'Replacement text' }).fill('Keep my change');
  const dialogEvent = page.waitForEvent('dialog');
  const clicking = page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'All tools', exact: true })
    .click();
  const dialog = await dialogEvent;
  expect(dialog.message()).toContain('not been downloaded');
  await dialog.dismiss();
  await clicking;
  await expect(page).toHaveURL(/edit-pdf-text/);
  await expect(page.getByRole('textbox', { name: 'Replacement text' })).toHaveValue(
    'Keep my change',
  );
});
test('Pro sample edits original text, previews and exports it, and can undo', async ({ page }) => {
  await page.goto('/edit-pdf-text?demo=1');
  await expect(page.locator('.pro-editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await page.getByRole('textbox', { name: 'Replacement text' }).fill('A space to');
  await page.getByRole('button', { name: 'Update PDF preview', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Preview updated' })).toBeVisible();
  await expect(page.locator('.pro-editable-page .sr-only')).toContainText('A space to');
  await expect(page.locator('.pro-editable-page .sr-only')).not.toContainText('A place to');
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const bytes = new Uint8Array(await readFile((await (await event).path())!));
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: bytes, useSystemFonts: true });
  const doc = await task.promise;
  const content = await (await doc.getPage(1)).getTextContent();
  const text = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
  expect(text).toContain('A space to');
  expect(text).not.toContain('A place to');
  await task.destroy();
  await page.getByRole('button', { name: 'Undo text change' }).click();
  await expect(page.getByRole('textbox', { name: 'Replacement text' })).toHaveValue('A place to');
  await page.getByRole('button', { name: 'Update PDF preview', exact: true }).click();
  await expect(page.locator('.pro-editable-page .sr-only')).toContainText('A place to');
});
test('Pro finds and replaces text across pages in the real sample', async ({ page }) => {
  await page.goto('/edit-pdf-text?demo=1');
  await expect(page.locator('.pro-editable-page canvas')).toBeVisible();
  await page.getByText('Find & replace', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Find', exact: true }).fill('STUDIO NORTH');
  await page.getByRole('textbox', { name: 'Replace with', exact: true }).fill('STUDIO SOUTH');
  await page.getByRole('button', { name: 'Replace across document' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'replacements ready' })).toBeVisible();
  await page.getByRole('button', { name: 'Update PDF preview', exact: true }).click();
  await expect(page.locator('.pro-editable-page .sr-only')).toContainText('STUDIO SOUTH');
  await page.getByRole('button', { name: 'Next PDF page' }).click();
  await expect(page.locator('.pro-editable-page .sr-only')).toContainText('STUDIO SOUTH');
});
test('premium operations and billing cannot be unlocked with client flags or a success URL', async ({
  page,
  request,
}) => {
  for (const route of ['/api/pro/pdf', '/api/billing/checkout', '/api/billing/portal']) {
    const response = await request.post(route, {
      data: { pro: true, plan: 'pro', interval: 'month' },
      headers: { Cookie: 'plan=pro; subscription=active' },
    });
    expect(response.status(), route).toBe(401);
  }
  await page.goto('/account?checkout=success');
  await expect(
    page.getByText('Accounts and purchases are not connected yet.', { exact: false }),
  ).toBeVisible();
  await page.goto('/edit-pdf-text');
  await page.evaluate(() => localStorage.setItem('folio-pro', 'true'));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Choose your PDF' })).toBeEnabled();
  await page.goto('/protect-pdf');
  await expect(
    page.getByRole('button', { name: 'Protect & download', exact: true }),
  ).toBeDisabled();
  const plans = await (await request.get('/api/billing/plans')).json();
  expect(plans.ready).toBe(false);
  await page.goto('/pricing');
  await expect(page.getByRole('button', { name: 'Checkout not available yet' })).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Start with free tools' })).toBeVisible();
  expect(
    (
      await request.post('/api/pro/demo', {
        data: { operation: 'inspect', bytes: 'user-supplied-file' },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post('/api/pro/demo', {
        data: { operation: 'protect', password: 'password123' },
      })
    ).status(),
  ).toBe(400);
});
test('Pro pages keep SEO, accessible controls, and mobile layouts', async ({ page, request }) => {
  for (const route of ['/pricing', '/edit-pdf-text', '/protect-pdf']) {
    const html = await (await request.get(route)).text();
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('name="description"');
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      route,
    ).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/pricing', '/edit-pdf-text?demo=1', '/protect-pdf', '/account']) {
    await page.goto(route);
    if (route.includes('demo'))
      await expect(page.locator('.pro-editable-page canvas')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
  }
  for (const route of ['/account', '/auth/callback'])
    expect((await request.get(route)).headers()['x-robots-tag']).toBe('noindex, nofollow');
});

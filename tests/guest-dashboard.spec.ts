import { test, expect } from './fixtures/editor-storage';
import { mockGoogle } from './fixtures/auth';
import { createSample } from '../src/lib/sample';
import { FREE_STORAGE_LIMIT } from '../src/lib/cloud-types';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test('guest sign-out retries on failure, clears the session and updates other open tabs', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue as guest', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your guest workspace.' })).toBeVisible();
  const cookie = (await context.cookies()).find(
    (entry) => entry.name === 'folio-workspace-session',
  )!;
  const other = await context.newPage();
  await other.goto('/dashboard?view=files');
  await expect(other.getByRole('button', { name: 'Upload PDF', exact: true })).toBeEnabled();
  const signOut = page.getByRole('button', { name: 'Sign out', exact: true });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(signOut).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const logo = await page
      .getByRole('link', { name: 'Folio home', exact: true })
      .first()
      .boundingBox();
    const button = await signOut.boundingBox();
    if (width <= 900) expect(button!.x).toBeGreaterThan(logo!.x + logo!.width);
    await page.screenshot({ path: testInfo.outputPath(`guest-sign-out-${width}.png`) });
  }
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  let fail = true;
  await page.route('**/api/workspaces/session', async (route) => {
    if (route.request().method() === 'DELETE' && fail)
      await route.fulfill({ status: 503, json: { error: 'Temporarily unavailable.' } });
    else await route.fallback();
  });
  await signOut.click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Sign-out could not finish',
  );
  await expect(signOut).toBeEnabled();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect((await context.cookies()).find((entry) => entry.name === cookie.name)?.value).toBe(
    cookie.value,
  );
  fail = false;
  await signOut.click();
  for (const tab of [page, other]) {
    await expect(tab).toHaveURL(/\/account$/);
    const header = tab.locator('.header-actions');
    await expect(header.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Dashboard', exact: true })).toHaveCount(0);
  }
  expect((await context.cookies()).find((entry) => entry.name === cookie.name)).toBeUndefined();
  await page.reload();
  await expect(
    page.locator('.header-actions').getByRole('link', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue as guest', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your guest workspace.' })).toBeVisible();
  expect((await context.cookies()).find((entry) => entry.name === cookie.name)?.value).not.toBe(
    cookie.value,
  );
});

test('guest sign-in retries safely, shares the account button and ends when its cookie expires', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('/account');
  const header = page.locator('.header-actions');
  const continueGuest = page.getByRole('button', { name: 'Continue as guest', exact: true });
  await expect(header.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  expect(
    (await context.cookies()).find((cookie) => cookie.name === 'folio-workspace-session'),
  ).toBeUndefined();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(continueGuest).toBeEnabled();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('guest-sign-in-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.screenshot({ path: testInfo.outputPath('guest-sign-in-desktop.png'), fullPage: true });
  let fail = true;
  await page.route('**/api/workspaces/session', async (route) => {
    if (route.request().method() === 'POST' && fail)
      await route.fulfill({ status: 503, json: { error: 'Temporarily unavailable.' } });
    else await route.fallback();
  });
  await continueGuest.click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'Your guest session could not start',
  );
  await expect(continueGuest).toBeEnabled();
  await expect(page).toHaveURL(/\/account$/);
  fail = false;
  await continueGuest.click();
  await expect(page.getByRole('heading', { name: 'Your guest workspace.' })).toBeVisible();
  const cookie = (await context.cookies()).find(
    (entry) => entry.name === 'folio-workspace-session',
  )!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.expires).toBeGreaterThan(Date.now() / 1000 + 86300);
  await page.goto('/');
  await expect(header.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const mobile = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(mobile.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(mobile.getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close navigation' }).click();
  await context.clearCookies({ name: 'folio-workspace-session' });
  await page.reload();
  await expect(header.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(header.getByRole('link', { name: 'Dashboard', exact: true })).toHaveCount(0);
  await page.goto('/account?next=%2Fadmin');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await expect(continueGuest).toHaveCount(0);
});

test('simultaneous guest dashboard tabs share one private browser session', async ({
  page,
  context,
}) => {
  let created = 0;
  await context.route('**/api/workspaces', async (route) => {
    expect(route.request().method()).toBe('GET');
    const existing = route.request().headers().cookie?.includes('folio-workspace-session=');
    const headers: Record<string, string> = {};
    if (!existing) {
      const token = String(++created).padStart(64, '0');
      headers['set-cookie'] = `folio-workspace-session=${token}; Path=/; HttpOnly; SameSite=Lax`;
      // Keep session creation in flight while the second tab mounts.
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await route.fulfill({
      headers,
      json: {
        files: [],
        storage: {
          used: 0,
          limit: FREE_STORAGE_LIMIT,
          available: FREE_STORAGE_LIMIT,
          full: false,
          recovery: [],
        },
      },
    });
  });
  const second = await context.newPage();
  await Promise.all([page.goto('/dashboard?view=files'), second.goto('/dashboard?view=files')]);
  await expect(page.getByRole('button', { name: 'Upload PDF', exact: true })).toBeEnabled();
  await expect(second.getByRole('button', { name: 'Upload PDF', exact: true })).toBeEnabled();
  expect(created).toBe(1);
  expect(
    (await context.cookies()).find((cookie) => cookie.name === 'folio-workspace-session')?.httpOnly,
  ).toBe(true);
});

test('guest dashboard uploads, restores edited files, downloads, renames and expires them', async ({
  page,
  workspaceStorage,
}, testInfo) => {
  await page.goto('/');
  const header = page.locator('.header-actions');
  await expect(header.getByRole('link', { name: 'Dashboard', exact: true })).toHaveCount(0);
  await header.getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Continue as guest', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your guest workspace.' })).toBeVisible();
  await page.goto('/');
  await page.reload();
  await expect(header.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(header.locator('a')).toHaveCount(1);
  await expect(header.getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0);
  for (const width of [1440, 1150, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(header.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 1440, height: 960 });
  await expect(
    page.locator('.header-actions').getByRole('link', { name: 'Dashboard', exact: true }),
  ).toBeVisible();
  await page
    .locator('.header-actions')
    .getByRole('link', { name: 'Dashboard', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Your guest workspace.' })).toBeVisible();
  await expect(page.getByText('0 KB of 100 MB')).toBeVisible();
  const buffer = Buffer.from(await createSample());
  await page
    .getByLabel('Upload PDF to cloud')
    .setInputFiles({ name: 'Guest proposal.pdf', mimeType: 'application/pdf', buffer });
  await expect(
    page.getByRole('link', { name: 'Open Guest proposal.pdf', exact: true }),
  ).toBeVisible();
  const original = [...workspaceStorage.records.values()][0];
  await page.getByRole('link', { name: 'Open Guest proposal.pdf', exact: true }).click();
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  await page
    .getByRole('textbox', { name: 'Edit added text', exact: true })
    .fill('My guest annotation');
  await page
    .getByRole('textbox', { name: 'Edit added text', exact: true })
    .press('ControlOrMeta+s');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await page.goto('/dashboard?view=files');
  await page
    .getByLabel('Upload PDF to cloud')
    .setInputFiles({ name: 'Second proposal.pdf', mimeType: 'application/pdf', buffer });
  await expect(
    page.getByRole('link', { name: 'Open Second proposal.pdf', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('link', { name: 'Open Guest proposal.pdf', exact: true }),
  ).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: testInfo.outputPath(`guest-files-${width}.png`),
      fullPage: true,
    });
  }
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 960 });
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Guest proposal.pdf', exact: true }).click();
  const downloaded = await downloadEvent;
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = getDocument({
    data: new Uint8Array(await readFile((await downloaded.path())!)),
    useSystemFonts: true,
  });
  expect(
    (await (await (await pdf.promise).getPage(1)).getTextContent()).items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' '),
  ).toContain('My guest annotation');
  await pdf.destroy();
  await page.getByRole('button', { name: 'Rename Guest proposal.pdf', exact: true }).click();
  await page.getByLabel('File name', { exact: true }).fill('Renamed guest.pdf');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Open Renamed guest.pdf', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Open Renamed guest.pdf', exact: true }).click();
  await expect(page.locator('.annotation-text')).toContainText('My guest annotation');
  expect(workspaceStorage.uploads).toBe(2);
  await page.goto('/dashboard?view=files');
  original.expiresAt = new Date(Date.now() - 1000).toISOString();
  await page.getByRole('button', { name: 'Refresh files', exact: true }).click();
  await expect(
    page.getByRole('link', { name: 'Open Renamed guest.pdf', exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole('link', { name: 'Open Second proposal.pdf', exact: true }),
  ).toBeVisible();
  await page.goto('/dashboard?view=settings');
  await expect(page.getByRole('heading', { name: 'Make this workspace yours.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await page.goto('/dashboard?view=billing');
  await expect(page.getByRole('heading', { name: 'Your free guest account.' })).toBeVisible();
});

test('guest storage blocks uploads at 100 MB and deletion frees space only after success', async ({
  page,
  workspaceStorage,
}) => {
  const buffer = Buffer.from(await createSample());
  for (const name of ['First.pdf', 'Second.pdf']) {
    const id = crypto.randomUUID();
    workspaceStorage.records.set(id, {
      id,
      name,
      size: 50 * 1024 * 1024,
      revision: 0,
      snapshot: null,
      bytes: buffer,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  await page.goto('/dashboard?view=files');
  await expect(page.getByText('100.0 MB of 100 MB', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload PDF', exact: true })).toBeDisabled();
  await page
    .getByLabel('Upload PDF to cloud')
    .setInputFiles({ name: 'Not allowed.pdf', mimeType: 'application/pdf', buffer });
  await expect(page.locator('main').getByRole('alert')).toContainText(
    'There is not enough private storage',
  );
  expect(workspaceStorage.uploads).toBe(0);
  workspaceStorage.failDeletes = true;
  await page.getByRole('button', { name: 'Delete First.pdf', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Delete file', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('could not be fully removed');
  expect(workspaceStorage.records.size).toBe(2);
  workspaceStorage.failDeletes = false;
  await dialog.getByRole('button', { name: 'Delete file', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('50.0 MB of 100 MB', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload PDF', exact: true })).toBeEnabled();
  await page
    .getByLabel('Upload PDF to cloud')
    .setInputFiles({ name: 'New.pdf', mimeType: 'application/pdf', buffer });
  await expect(page.getByRole('link', { name: 'Open New.pdf', exact: true })).toBeVisible();
});

test('sign-in retains every guest file even when the account is full and claims them after space is freed', async ({
  page,
  context,
  workspaceStorage,
}) => {
  await mockGoogle(context);
  const buffer = Buffer.from(await createSample());
  await page.goto('/dashboard?view=files');
  for (const name of ['One.pdf', 'Two.pdf']) {
    await page
      .getByLabel('Upload PDF to cloud')
      .setInputFiles({ name, mimeType: 'application/pdf', buffer });
    await expect(page.getByRole('link', { name: `Open ${name}`, exact: true })).toBeVisible();
  }
  workspaceStorage.accountFull = true;
  const existingId = crypto.randomUUID();
  await page.route(`**/api/account/files/${existingId}`, async (route) => {
    expect(route.request().method()).toBe('DELETE');
    workspaceStorage.accountFull = false;
    await route.fulfill({ json: { removed: true } });
  });
  await page.route('**/api/account/files', async (route) => {
    const files = workspaceStorage.accountFull
      ? [
          {
            id: existingId,
            name: 'Old account file.pdf',
            size: FREE_STORAGE_LIMIT,
            status: 'ready',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
      : [...workspaceStorage.records.values()]
          .filter((f) => f.expiresAt === null)
          .map((f) => ({
            id: f.id,
            name: f.name,
            size: f.size,
            status: 'ready',
            created_at: f.updatedAt,
            updated_at: f.updatedAt,
          }));
    const used = workspaceStorage.accountFull ? FREE_STORAGE_LIMIT : buffer.length * 2;
    await route.fulfill({
      json: {
        files,
        storage: {
          used,
          limit: FREE_STORAGE_LIMIT,
          available: FREE_STORAGE_LIMIT - used,
          full: used >= FREE_STORAGE_LIMIT,
          recovery: [],
        },
      },
    });
  });
  await page.goto('/dashboard?view=settings');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await page.goto('/dashboard?view=files');
  await expect(
    page.getByRole('status').filter({ hasText: 'Some guest files could not fit' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open One.pdf', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Two.pdf', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete Old account file.pdf', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete file', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Some guest files could not fit' }),
  ).toBeHidden();
  for (const file of workspaceStorage.records.values()) expect(file.expiresAt).toBeNull();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Open One.pdf', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Two.pdf', exact: true })).toBeVisible();
  expect(workspaceStorage.uploads).toBe(2);
});

import { test, expect } from './fixtures/editor-storage';
import type { Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { createSample } from '../src/lib/sample';
import { DEFAULT_CATALOG, DEFAULT_SETTINGS } from '../src/lib/platform';
async function mockGoogle(page: Page, admin = false, fail = false) {
  let challenge = '';
  const id = '00000000-0000-4000-8000-000000000001',
    now = Math.floor(Date.now() / 1000);
  const jwt = [
    { alg: 'HS256', typ: 'JWT' },
    { sub: id, exp: now + 3600, iat: now, aud: 'authenticated', role: 'authenticated' },
    'fixture',
  ]
    .map((v) => Buffer.from(JSON.stringify(v)).toString('base64url'))
    .join('.');
  let fixtureUser = {
    id,
    email: 'customer@example.test',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString(),
    app_metadata: { provider: 'google', providers: ['google'] },
    user_metadata: { role: 'super_admin', name: 'Fixture User' },
    identities: [],
  };
  await page.route('https://folio-auth-tests.example.test/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/storage/v1/object/info/folio-recovery/')) {
      await route.fulfill({ status: 404, json: { error: 'not_found' } });
      return;
    }
    if (url.pathname === '/auth/v1/authorize') {
      expect(url.searchParams.get('provider')).toBe('google');
      expect(url.searchParams.get('code_challenge_method')?.toLowerCase()).toBe('s256');
      expect(url.searchParams.get('prompt')).toBe('select_account');
      challenge = url.searchParams.get('code_challenge')!;
      expect(challenge).toBeTruthy();
      const callback = new URL(url.searchParams.get('redirect_to')!);
      expect(callback.origin).toBe('http://127.0.0.1:3001');
      expect(callback.pathname).toBe('/auth/callback');
      callback.searchParams.set('code', 'fixture-code');
      await route.fulfill({ status: 302, headers: { location: callback.href } });
      return;
    }
    if (url.pathname === '/auth/v1/token') {
      expect(url.searchParams.get('grant_type')).toBe('pkce');
      const body = route.request().postDataJSON();
      expect(body.auth_code).toBe('fixture-code');
      expect(createHash('sha256').update(body.code_verifier).digest('base64url')).toBe(challenge);
      if (fail) {
        await route.fulfill({
          status: 400,
          json: { error: 'invalid_grant', error_description: 'Expired authorization code' },
        });
        return;
      }
      await route.fulfill({
        json: {
          access_token: jwt,
          refresh_token: 'fixture-refresh',
          token_type: 'bearer',
          expires_in: 3600,
          user: fixtureUser,
        },
      });
      return;
    }
    if (url.pathname === '/auth/v1/user') {
      if (route.request().method() === 'PUT')
        fixtureUser = {
          ...fixtureUser,
          user_metadata: { ...fixtureUser.user_metadata, ...route.request().postDataJSON().data },
        };
      await route.fulfill({ json: fixtureUser });
      return;
    }
    if (url.pathname === '/auth/v1/logout') {
      await route.fulfill({ status: 204 });
      return;
    }
    throw new Error(`Unexpected auth request: ${url.pathname}`);
  });
  await page.route('**/api/account/access', async (route) => {
    expect(route.request().headers().authorization).toBe(`Bearer ${jwt}`);
    await route.fulfill({
      json: {
        pro: false,
        admin,
        trial: false,
        expiresAt: null,
        cancelAtPeriodEnd: false,
        billingReady: false,
      },
    });
  });
  await page.route('**/api/account/files', (route) => route.fulfill({ json: { files: [] } }));
  await page.route('**/api/account/billing', (route) =>
    route.fulfill({ json: { hasCustomer: false, subscription: null } }),
  );
  await page.route('**/api/support', (route) =>
    route.fulfill({ json: { tickets: [], messages: [] } }),
  );
  await page.route('**/api/admin?**', (route) =>
    route.fulfill(
      admin
        ? {
            json: {
              catalog: DEFAULT_CATALOG,
              settings: DEFAULT_SETTINGS,
              stripeReady: false,
              overview: {
                users: 3,
                paid: 0,
                trials: 0,
                operations: 0,
                suspended: 0,
                openTickets: 0,
              },
              users: { rows: [], total: 0 },
            },
          }
        : { status: 403, json: { error: 'Super admin access is required.' } },
    ),
  );
}
test('Google creates a PKCE session, uses the customer account, and signs out', async ({
  page,
}) => {
  await mockGoogle(page);
  await page.goto('/account');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Fixture.' })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('link', { name: 'Open super admin dashboard' })).toBeHidden();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/folio-google-login-mobile.png', fullPage: true });
});
test('assigned super admin can sign in and sign out from the dashboard', async ({ page }) => {
  await mockGoogle(page, true);
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeHidden();
  await expect(
    page.locator('.admin-metrics article').filter({ hasText: 'Total users' }),
  ).toContainText('3');
  await expect(page.getByRole('button', { name: 'Users', exact: true })).toBeEnabled();
  const signOut = page.getByRole('button', { name: 'Sign out', exact: true });
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(signOut).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  const logout = page.waitForRequest(
    (request) => new URL(request.url()).pathname === '/auth/v1/logout',
  );
  await signOut.click();
  expect(new URL((await logout).url()).searchParams.get('scope')).toBe('local');
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await page.goto('/admin');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await expect(signOut).toHaveCount(0);
  await expect(
    page.locator('.admin-metrics article').filter({ hasText: 'Total users' }),
  ).not.toContainText('3');
});
test('super admin activates users and confirms deletion with retry after cleanup failure', async ({
  page,
}) => {
  await mockGoogle(page, true);
  const customerId = '00000000-0000-4000-8000-000000000002';
  const account = {
    id: customerId,
    email: 'member@example.test',
    created_at: new Date().toISOString(),
    last_sign_in_at: null,
    suspended: true,
    is_admin: false,
    grant_until: null,
    deletion_pending: false,
  };
  let rows = [
    account,
    {
      ...account,
      id: '00000000-0000-4000-8000-000000000001',
      email: 'admin@example.test',
      is_admin: true,
      suspended: false,
    },
  ];
  let deletionAttempts = 0;
  const actions: Record<string, unknown>[] = [];
  await page.route('**/api/admin*', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      actions.push(body);
      expect(body.userId).toBe(customerId);
      if (body.action === 'user') {
        expect(body.operation).toBe('restore');
        account.suspended = false;
      } else {
        expect(body.action).toBe('delete_user');
        expect(body.confirmation).toBe('DELETE');
        expect(body.reason).toBe('Customer requested removal');
        deletionAttempts++;
        if (deletionAttempts === 1) {
          account.suspended = true;
          account.deletion_pending = true;
          await route.fulfill({
            status: 503,
            json: { error: 'Storage cleanup failed. Retry deletion to continue.' },
          });
          return;
        }
        rows = rows.filter((row) => row.id !== customerId);
      }
      await route.fulfill({ json: { saved: true } });
      return;
    }
    await route.fulfill({
      json: {
        catalog: DEFAULT_CATALOG,
        settings: DEFAULT_SETTINGS,
        stripeReady: true,
        userDeletionReady: true,
        overview: { users: 2, paid: 0, trials: 0, operations: 0, suspended: 1, openTickets: 0 },
        users: { rows, total: rows.length },
      },
    });
  });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Users', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: 'member@example.test' });
  const protectedRow = page.getByRole('row').filter({ hasText: 'admin@example.test' });
  await expect(
    protectedRow.getByRole('button', { name: 'Delete user', exact: true }),
  ).toBeDisabled();
  await expect(protectedRow.getByRole('button', { name: 'Suspend', exact: true })).toBeDisabled();
  await row.getByRole('button', { name: 'Activate', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading')).toHaveText('Activate this user?');
  await dialog.getByRole('textbox', { name: 'Reason for this change' }).fill('Account reviewed');
  await dialog.getByRole('button', { name: 'Confirm change' }).click();
  await expect(dialog).toBeHidden();
  await expect(row.getByRole('button', { name: 'Suspend', exact: true })).toBeEnabled();
  await expect(page.getByRole('status')).toContainText('The user is active');
  await row.getByRole('button', { name: 'Delete user', exact: true }).click();
  await expect(dialog).toContainText('member@example.test');
  const confirm = dialog.getByRole('button', { name: 'Permanently delete user', exact: true });
  await expect(confirm).toBeDisabled();
  await dialog
    .getByRole('textbox', { name: 'Reason for this change' })
    .fill('Customer requested removal');
  await dialog.getByRole('textbox', { name: 'Type DELETE to confirm' }).fill('delete');
  await expect(confirm).toBeDisabled();
  expect(deletionAttempts).toBe(0);
  await dialog.getByRole('textbox', { name: 'Type DELETE to confirm' }).fill('DELETE');
  await confirm.click();
  await expect(dialog.getByRole('alert')).toContainText('Storage cleanup failed');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(row).toContainText('Deletion pending');
  await expect(row.getByRole('button', { name: 'Activate', exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await row.getByRole('button', { name: 'Retry deletion', exact: true }).click();
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('textbox', { name: 'Type DELETE to confirm' }).fill('DELETE');
  await dialog
    .getByRole('textbox', { name: 'Reason for this change' })
    .fill('Customer requested removal');
  await confirm.click();
  await expect(dialog).toBeHidden();
  await expect(row).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('permanently deleted');
  expect(actions.map((action) => action.action)).toEqual(['user', 'delete_user', 'delete_user']);
});

test('regular Google account requested admin access is kept in its own account', async ({
  page,
}) => {
  await mockGoogle(page);
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/notice=admin-required/);
  await expect(
    page.getByRole('status').filter({ hasText: 'does not have super admin access' }),
  ).toBeVisible();
  await page.goto('/admin');
  await expect(page.locator('main [role=alert]')).toContainText('Super admin access');
});
test('monthly choice survives Google sign-in', async ({ page }) => {
  await mockGoogle(page);
  await page.goto('/account?next=%2Fpricing%3Fplan%3Dmonth');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/pricing\?plan=month$/);
});
test('expired authorization codes show recovery instead of a signed-in account', async ({
  page,
}) => {
  await mockGoogle(page, false, true);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.locator('main [role=alert]')).toContainText('could not be verified');
  await expect(page).toHaveURL(/\/auth\/callback$/);
  await expect(page.getByRole('link', { name: 'Back to sign in' })).toBeVisible();
});
test('cancelled and incomplete callbacks scrub parameters and reject external destinations', async ({
  page,
}) => {
  for (const suffix of [
    '?error=access_denied&next=https://evil.test#error_description=private',
    '?next=//evil.test',
  ]) {
    await page.goto(`/auth/callback${suffix}`);
    await expect(page.locator('main [role=alert]')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/callback$/);
    await expect(page.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
      'href',
      '/account?next=%2Faccount',
    );
  }
});

test('dashboard profile persists, billing is reachable, and layouts stay accessible', async ({
  page,
}) => {
  await mockGoogle(page);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(page.getByRole('heading', { name: 'Welcome back, Fixture.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 1440 || width === 320) {
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({ path: `/tmp/folio-dashboard-${width}.png`, fullPage: true });
    }
  }
  await page.getByRole('link', { name: 'Account settings', exact: true }).click();
  await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('Arshad Nawaz');
  await page.getByRole('textbox', { name: 'Company' }).fill('North Studio');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status')).toContainText('Your profile has been saved');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Full name', exact: true })).toHaveValue(
    'Arshad Nawaz',
  );
  await expect(page.getByRole('textbox', { name: 'Company' })).toHaveValue('North Studio');
  await page.getByRole('button', { name: 'Sign out other sessions' }).click();
  const otherLogout = page.waitForRequest((r) => r.url().includes('/auth/v1/logout?scope=others'));
  await page.getByRole('button', { name: 'Confirm sign-out' }).click();
  await otherLogout;
  await expect(page.getByRole('status')).toContainText('still signed in here');
  await page.getByRole('link', { name: 'Billing & plan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Manage billing', exact: true })).toBeDisabled();
  await page.route('**/api/account/billing', (route) =>
    route.fulfill({
      json: {
        hasCustomer: true,
        subscription: { status: 'past_due', current_period_end: null, cancel_at_period_end: false },
      },
    }),
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Manage billing', exact: true })).toBeEnabled();
  await expect(page.getByRole('status')).toContainText('payment needs attention');
  await page.route('**/api/billing/portal', (route) =>
    route.fulfill({ json: { url: 'https://evil.example.test' } }),
  );
  await page.getByRole('button', { name: 'Manage billing', exact: true }).click();
  await expect(page.locator('main [role=alert]')).toContainText('could not be verified');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('cloud library uploads, renames, downloads and opens real PDF bytes', async ({
  page,
  workspaceStorage,
}) => {
  await mockGoogle(page);
  const bytes = Buffer.from(await createSample('proposal'));
  const id = '00000000-0000-4000-8000-000000000010';
  workspaceStorage.records.set(id, {
    id,
    name: 'Client proposal.pdf',
    revision: 0,
    snapshot: null,
    bytes,
    expiresAt: null,
    updatedAt: new Date().toISOString(),
  });
  let uploaded = false,
    saved = false,
    name = 'My proposal.pdf';
  const record = () => ({
    id,
    name,
    size: bytes.length,
    status: saved ? 'ready' : 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  await page.route('**/api/account/files', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      expect(body.size).toBe(bytes.length);
      name = body.name;
      await route.fulfill({ status: 201, json: { id, path: `account/${id}.pdf` } });
    } else await route.fulfill({ json: { files: uploaded ? [record()] : [] } });
  });
  await page.route(`**/api/account/files/${id}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      if (body.action === 'finish') {
        expect(uploaded).toBe(true);
        saved = true;
      } else name = body.name;
      await route.fulfill({ json: record() });
    } else if (route.request().method() === 'DELETE') {
      uploaded = false;
      saved = false;
      await route.fulfill({ json: { removed: true } });
    } else await route.fulfill({ json: { name, path: `account/${id}.pdf` } });
  });
  await page.route('https://folio-auth-tests.example.test/storage/v1/**', async (route) => {
    expect(route.request().headers().authorization).toContain('Bearer ');
    if (route.request().method() === 'POST') {
      expect(route.request().postDataBuffer()?.includes(bytes)).toBe(true);
      uploaded = true;
      await route.fulfill({ json: { Key: `folio-documents/account/${id}.pdf` } });
    } else await route.fulfill({ body: bytes, contentType: 'application/pdf' });
  });
  await page.goto('/dashboard?view=files');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/dashboard\?view=files$/);
  await page
    .getByLabel('Upload PDF to cloud', { exact: true })
    .setInputFiles({ name, mimeType: 'application/pdf', buffer: bytes });
  await expect(page.getByRole('link', { name: 'My proposal.pdf', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Rename My proposal.pdf', exact: true }).click();
  await page.getByRole('textbox', { name: 'File name', exact: true }).fill('Client proposal.pdf');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Client proposal.pdf', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search cloud files' }).fill('not present');
  await expect(page.getByRole('heading', { name: 'No matching files.' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search cloud files' }).fill('');
  await page.getByRole('combobox', { name: 'Sort files' }).click();
  await page.getByRole('option', { name: 'Name A–Z' }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Client proposal.pdf', exact: true }).click();
  const result = await downloaded;
  expect(result.suggestedFilename()).toBe('Client proposal.pdf');
  await page.getByRole('link', { name: 'Open Client proposal.pdf', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Document name', exact: true })).toHaveValue(
    'Client proposal.pdf',
  );
  await expect(page.getByRole('button', { name: 'Save to cloud', exact: true })).toBeEnabled();
  await page.goto('/dashboard?view=files');
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Delete Client proposal.pdf', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(uploaded).toBe(true);
  await page.getByRole('button', { name: 'Delete Client proposal.pdf', exact: true }).click();
  await page.getByRole('button', { name: 'Delete file', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your next document belongs here.' }),
  ).toBeVisible();
});

test('editor cloud saves and browser draft imports include the finished PDF edits', async ({
  page,
  workspaceStorage,
}) => {
  await mockGoogle(page);
  const uploaded: Uint8Array[] = [];
  let failSave = false;
  await page.route('**/api/account/files', async (route) => {
    if (route.request().method() === 'POST') {
      if (failSave) {
        await route.fulfill({ status: 503, json: { error: 'Storage temporarily unavailable.' } });
        return;
      }
      const body = route.request().postDataJSON();
      expect(body.name).toMatch(/\.pdf$/);
      expect(body.size).toBeGreaterThan(0);
      const id = '00000000-0000-4000-8000-00000000001' + uploaded.length;
      await route.fulfill({ status: 201, json: { id, path: `account/${id}.pdf` } });
    } else await route.fulfill({ json: { files: [] } });
  });
  await page.route('**/api/account/files/*', (route) =>
    route.fulfill({ json: { status: 'ready' } }),
  );
  await page.route('https://folio-auth-tests.example.test/storage/v1/**', async (route) => {
    if (route.request().url().includes('/object/info/folio-recovery/')) {
      await route.fulfill({ status: 404, json: { error: 'not_found' } });
      return;
    }
    expect(route.request().method()).toBe('POST');
    const request = new Request(route.request().url(), {
      method: 'POST',
      headers: route.request().headers(),
      body: new Uint8Array(route.request().postDataBuffer()!),
    });
    const form = await request.formData();
    const file = [...form.values()].find((value) => typeof value !== 'string');
    expect(file).toBeTruthy();
    if (typeof file !== 'string' && file) uploaded.push(new Uint8Array(await file.arrayBuffer()));
    await route.fulfill({ json: { Key: 'uploaded.pdf' } });
  });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  await page
    .getByRole('textbox', { name: 'Your text', exact: true })
    .fill('Saved across my devices');
  workspaceStorage.failSaves = true;
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('main [role=alert]')).toContainText('Storage temporarily unavailable');
  workspaceStorage.failSaves = false;
  await page.keyboard.press('ControlOrMeta+s');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await expect(page.getByRole('button', { name: 'Save locally', exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(async () => (await indexedDB.databases()).map((db) => db.name)),
  ).not.toContain('folio-local');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const { readFile } = await import('node:fs/promises');
  uploaded.push(new Uint8Array(await readFile((await (await download).path())!)));
  const { inspectPdf } = await import('../src/lib/pdf-engine');
  const inspected = await inspectPdf(uploaded[0]);
  // Seed a draft from the previous version to verify migration without reintroducing local saves.
  await page.evaluate(
    async ({ bytes, state }) => {
      const request = indexedDB.open('folio-local', 2);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('documents', { keyPath: 'id' });
        request.result.createObjectStore('summaries', { keyPath: 'id' });
      };
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction(['documents', 'summaries'], 'readwrite');
      const summary = {
        id: 'legacy',
        name: 'Earlier proposal.pdf',
        updatedAt: Date.now(),
        size: bytes.length,
        pageCount: state.pages.length,
      };
      tx.objectStore('documents').put({ ...summary, bytes: new Uint8Array(bytes), state });
      tx.objectStore('summaries').put(summary);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { bytes: Array.from(uploaded[0]), state: inspected.state },
  );
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/documents');
  await expect(page).toHaveURL(/dashboard\?view=files$/);
  await expect(page.getByRole('button', { name: 'On this device' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Review older drafts', exact: true }).click();
  failSave = true;
  await page.getByRole('button', { name: 'Move to cloud', exact: true }).click();
  await expect(page.locator('main [role=alert]')).toContainText('Storage temporarily unavailable');
  await expect(page.getByText('Earlier proposal.pdf', { exact: true })).toBeVisible();
  failSave = false;
  await page.getByRole('button', { name: 'Move to cloud', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'moved to cloud storage' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review older drafts', exact: true })).toHaveCount(
    0,
  );
  expect(uploaded.length).toBe(2);
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  for (const data of uploaded) {
    const task = getDocument({ data, useSystemFonts: true });
    const pdf = await task.promise;
    const text = await (await pdf.getPage(1)).getTextContent();
    expect(text.items.map((item) => ('str' in item ? item.str : '')).join(' ')).toContain(
      'Saved across my devices',
    );
    await task.destroy();
  }
});

for (const tool of ['pro-text', 'translate-pdf'] as const) {
  test(`signed-in ${tool} checkout recovery uses private cloud storage`, async ({ page }) => {
    await mockGoogle(page);
    const objects = new Map<string, string>();
    await page.route('https://folio-auth-tests.example.test/storage/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname.split('/folio-recovery/')[1];
      expect(route.request().headers().authorization).toContain('Bearer ');
      if (route.request().method() === 'POST') {
        expect(path).toMatch(new RegExp(`^00000000-0000-4000-8000-000000000001/${tool}\\.json$`));
        const request = new Request(route.request().url(), {
          method: 'POST',
          headers: route.request().headers(),
          body: new Uint8Array(route.request().postDataBuffer()!),
        });
        const form = await request.formData();
        const file = [...form.values()].find((value) => typeof value !== 'string');
        if (typeof file === 'string' || !file) throw new Error('Missing recovery file');
        const body = await file.text();
        expect(JSON.parse(body).expiresAt).toBeGreaterThan(Date.now());
        objects.set(path, body);
        await route.fulfill({ json: { Key: path } });
      } else if (route.request().method() === 'DELETE') {
        for (const key of route.request().postDataJSON().prefixes) objects.delete(key);
        await route.fulfill({ json: [] });
      } else if (objects.has(path))
        await route.fulfill({ body: objects.get(path), contentType: 'application/json' });
      else await route.fulfill({ status: 404, json: { message: 'Not found' } });
    });
    await page.goto('/account');
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const buffer = Buffer.from(await createSample('proposal'));
    if (tool === 'pro-text') {
      await page.goto('/edit-pdf-text');
      await page
        .locator('input[type=file]')
        .setInputFiles({ name: 'Cloud proposal.pdf', mimeType: 'application/pdf', buffer });
      await page.getByRole('button', { name: 'Upload for text editing' }).click();
      await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
      await page
        .getByRole('textbox', { name: 'Replacement text' })
        .fill('Recovered from my account');
    } else {
      await page.route('**/api/capabilities', (route) =>
        route.fulfill({ json: { tools: { 'translate-pdf': true } } }),
      );
      await page.route('**/api/documents/process', (route) =>
        route.fulfill({
          json: {
            tool,
            artifact: 'encrypted-private-result',
            filename: 'Cloud proposal-es.pdf',
            pages: 1,
            size: 1000,
            expiresAt: Date.now() + 86400000,
            source: 'auto',
            target: 'es',
          },
        }),
      );
      await page.goto('/translate-pdf');
      await page
        .locator('input[type=file]')
        .setInputFiles({ name: 'Cloud proposal.pdf', mimeType: 'application/pdf', buffer });
      await page.getByRole('button', { name: 'Translate PDF', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    await expect(
      page.getByText('Your recovery draft is saved in cloud storage.', { exact: false }),
    ).toBeVisible();
    expect(objects.size).toBe(1);
    expect(
      await page.evaluate(async () =>
        (await indexedDB.databases()).filter((db) =>
          ['folio-pro-draft', 'folio-prepared-documents'].includes(db.name || ''),
        ),
      ),
    ).toEqual([]);
    page.on('dialog', (dialog) => void dialog.accept());
    await page.reload();
    await expect(
      page.getByText(
        tool === 'pro-text'
          ? 'Recovered your edits from cloud storage.'
          : 'Recovered your prepared document from cloud storage.',
        { exact: false },
      ),
    ).toBeVisible();
    if (tool === 'pro-text') {
      await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
      await expect(page.getByRole('textbox', { name: 'Replacement text' })).toHaveValue(
        'Recovered from my account',
      );
    }
  });
}

test('inline text workspace saves privately, restores annotations and only exports after verified access', async ({
  page,
  workspaceStorage,
}) => {
  await mockGoogle(page);
  let paid = false;
  let exports = 0;
  await page.route('**/api/account/access', (route) =>
    route.fulfill({
      json: {
        pro: paid,
        admin: false,
        trial: false,
        expiresAt: null,
        cancelAtPeriodEnd: false,
        billingReady: false,
      },
    }),
  );
  await page.route('**/api/account/files', (route) =>
    route.fulfill({
      json: {
        files: [...workspaceStorage.records.values()].map((file) => ({
          ...file,
          bytes: undefined,
          snapshot: undefined,
          status: 'ready',
          size: file.bytes?.length || 1,
          created_at: file.updatedAt,
          updated_at: file.updatedAt,
        })),
      },
    }),
  );
  await page.route('**/api/pro/pdf', async (route) => {
    expect(paid).toBe(true);
    expect(route.request().headers().authorization).toContain('Bearer ');
    exports++;
    const request = new Request(route.request().url(), {
      method: 'POST',
      headers: route.request().headers(),
      body: new Uint8Array(route.request().postDataBuffer()!),
    });
    const form = await request.formData();
    const { processTextPdf } = await import('../scripts/pdf-text-engine.mjs');
    const result = await processTextPdf(
      new Uint8Array(await (form.get('file') as File).arrayBuffer()),
      JSON.parse(form.get('job') as string),
    );
    await route.fulfill({
      body: Buffer.from(result as Uint8Array),
      contentType: 'application/pdf',
    });
  });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/workspace?sample=proposal');
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  await page
    .getByRole('textbox', { name: 'Edit added text', exact: true })
    .fill('Cloud annotation');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Edit original text: A place to', exact: true });
  await input.fill('Cloud original edit');
  await input.press('ControlOrMeta+s');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await expect(page).toHaveURL(/\/workspace\?cloud=/);
  expect(exports).toBe(0);
  const saved = [...workspaceStorage.records.values()][0];
  expect(saved.expiresAt).toBeNull();
  expect(saved.snapshot?.state.annotations[0].text).toBe('Cloud annotation');
  expect(JSON.stringify(saved.snapshot?.state.textChanges)).toContain('Cloud original edit');
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  async function pdfText(bytes: Uint8Array) {
    const task = getDocument({ data: bytes, useSystemFonts: true });
    const text = (await (await (await task.promise).getPage(1)).getTextContent()).items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    await task.destroy();
    return text;
  }
  expect(await pdfText(new Uint8Array(saved.bytes!))).not.toContain('Cloud original edit');
  await page.goto('/dashboard?view=files');
  await page.getByRole('link', { name: `Open ${saved.name}`, exact: true }).click();
  await expect(page.locator('.annotation-text')).toContainText('Cloud annotation');
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await expect(input).toHaveValue('Cloud original edit');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect(page.locator('.download-gate')).toBeVisible();
  expect(exports).toBe(0);
  paid = true;
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'I’ve paid — download my PDF', exact: true }).click();
  const { readFile } = await import('node:fs/promises');
  const output = new Uint8Array(await readFile((await (await event).path())!));
  expect(exports).toBe(1);
  const text = await pdfText(output);
  expect(text).toContain('Cloud original edit');
  expect(text).toContain('Cloud annotation');
  expect(text).not.toContain('A place to');
});

test('a guest workspace moves into the signed-in account and retains its document URL', async ({
  page,
  workspaceStorage,
}) => {
  await mockGoogle(page);
  await page.goto('/workspace?sample=proposal');
  await expect(page).toHaveURL(/cloud=/);
  const url = page.url();
  const file = [...workspaceStorage.records.values()][0];
  expect(file.expiresAt).toBeTruthy();
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto(url);
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await expect.poll(() => file.expiresAt).toBeNull();
  expect(workspaceStorage.uploads).toBe(1);
});

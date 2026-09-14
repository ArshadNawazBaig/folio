import { expect, type Page, type BrowserContext } from '@playwright/test';
import { createHash } from 'node:crypto';
import { DEFAULT_CATALOG, DEFAULT_SETTINGS } from '../../src/lib/platform';
import { FREE_STORAGE_LIMIT } from '../../src/lib/cloud-types';
const emptyStorage = {
  limit: FREE_STORAGE_LIMIT,
  used: 0,
  available: FREE_STORAGE_LIMIT,
  full: false,
  recovery: [],
};
export async function mockGoogle(page: Page | BrowserContext, admin = false, fail = false) {
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
  await page.route('**/api/account/files', (route) =>
    route.fulfill({ json: { files: [], storage: emptyStorage } }),
  );
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
              billingReady: false,
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

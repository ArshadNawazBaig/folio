// Use the real Next route here: storage fixtures must not mask host/origin bugs.
import { test, expect } from '@playwright/test';

test('browser uploads accept localhost and loopback with Next listening on all interfaces', async ({
  page,
  baseURL,
}) => {
  for (const hostname of ['localhost', '127.0.0.1']) {
    const url = new URL('/workspace', baseURL);
    url.hostname = hostname;
    await page.goto(url.href);
    const result = await page.evaluate(async () => {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'x-folio-workspace': '1', 'content-type': 'application/json' },
        body: '{}',
      });
      return { status: response.status, body: await response.json() };
    });
    // Invalid metadata is rejected before any storage call; origin validation passed.
    expect(result).toEqual({ status: 400, body: { error: 'Choose a PDF of up to 50 MB.' } });
  }
});

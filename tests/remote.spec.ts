import { test, expect } from '@playwright/test';
import { remoteTools } from '../src/lib/remote-types';
import { locales, languagePath } from '../src/lib/i18n/config';

test('removed document tools return 404 in every language and stay out of the sitemap', async ({
  request,
}) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  for (const tool of remoteTools) {
    expect(sitemap).not.toContain(`/${tool}`);
    for (const locale of locales) {
      const path = languagePath(locale, `/${tool}`);
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
      expect(await response.text(), path).toMatch(/name="robots" content="[^"]*noindex/);
    }
  }
  expect((await request.get('/translate-pdf-page', { maxRedirects: 0 })).status()).toBe(404);
  const response = await request.post('/api/documents/process', { data: { tool: 'pdf-to-word' } });
  expect(response.status()).toBe(410);
  const { tools } = await (await request.get('/api/capabilities')).json();
  for (const slug of remoteTools) expect(tools[slug]).toBe(false);
});

test('homepages and directories contain no retired tool links in any language', async ({
  request,
}) => {
  for (const locale of locales) {
    for (const route of ['/', '/tools', '/convert']) {
      const path = languagePath(locale, route);
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      const html = await response.text();
      for (const slug of remoteTools) {
        expect(html, path).not.toMatch(new RegExp(`href="(?:/[a-z]{2})?/${slug}(?:[?"#])`));
        expect(html, path).not.toContain(`"url":"https://thebestfreepdf.com/${slug}"`);
      }
    }
  }
});

test('mobile navigation and tool search no longer offer removed tools', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools');
  await expect(page.locator('.directory-card')).toHaveCount(28);
  for (const slug of remoteTools) await expect(page.locator(`a[href$="/${slug}"]`)).toHaveCount(0);
  await page.getByRole('button', { name: 'Search tools', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Search PDF tools' });
  for (const term of ['translate pdf', 'pdf to word', 'pdf to excel', 'pdf to powerpoint']) {
    await input.fill(term);
    await expect(page.locator('.search-results a')).toHaveCount(0);
  }
  await input.fill('compress');
  await expect(page.locator('.search-results a[href="/compress-pdf"]')).toBeVisible();
});

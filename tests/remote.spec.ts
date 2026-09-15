import { test, expect } from './fixtures/editor-storage';
import { createSample } from '../src/lib/sample';
const sample = await createSample();
const upload = { name: 'report.pdf', mimeType: 'application/pdf', buffer: Buffer.from(sample) };
test('disconnected converters still preview and preserve the original PDF', async ({ page }) => {
  await page.goto('/pdf-to-word');
  await page.locator('input[type=file]').setInputFiles(upload);
  await expect(page.locator('.translation-canvas canvas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Convert to Word', exact: true })).toBeDisabled();
  await expect(
    page.getByText('This processing service is not connected yet.', { exact: false }),
  ).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save original', exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe('report.pdf');
});
test('anonymous translation previews precede the paywall and stay in the current tab', async ({
  page,
}) => {
  let processed = 0;
  await page.route('**/api/capabilities', (route) =>
    route.fulfill({ json: { tools: { 'translate-pdf': true } } }),
  );
  await page.route('**/api/documents/process', (route) => {
    processed++;
    expect(route.request().headers().authorization).toBeUndefined();
    return route.fulfill({
      json: {
        tool: 'translate-pdf',
        artifact: 'encrypted-test-result',
        filename: 'report-pt.pdf',
        pages: 3,
        size: 1200,
        expiresAt: Date.now() + 86400000,
        source: 'auto',
        target: 'pt',
        preview: {
          preview:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j26kAAAAASUVORK5CYII=',
          width: 1,
          height: 1,
          page: 0,
        },
      },
    });
  });
  await page.goto('/translate-pdf');
  await page.locator('input[type=file]').setInputFiles(upload);
  await page.getByRole('combobox', { name: 'Translate into', exact: true }).click();
  await page.getByRole('option', { name: 'Portuguese', exact: true }).click();
  await page.getByRole('button', { name: 'Translate PDF', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Translated PDF, page 1' })).toBeVisible();
  expect(await page.locator('#main').innerText()).not.toMatch(
    /\b(pro|premium|upgrade|subscription)\b/i,
  );
  await expect(page.getByRole('dialog', { name: /download/i })).toBeHidden();
  expect(processed).toBe(1);
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByText('Downloading your translated document requires a premium plan.', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByText('Keep this tab open', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).last().click();
  expect(
    await page.evaluate(async () => (await indexedDB.databases()).map((db) => db.name)),
  ).not.toContain('folio-prepared-documents');
  await expect(page.getByRole('combobox', { name: 'Translate into', exact: true })).toContainText(
    'Portuguese',
  );
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeEnabled();
  expect(processed).toBe(1);
});

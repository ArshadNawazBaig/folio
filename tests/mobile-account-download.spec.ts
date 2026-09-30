import { test, expect } from './fixtures/editor-storage';
import { mockGoogle } from './fixtures/auth';
import { saveDirectDownload, saveDownload, watchDownloads } from './fixtures/download';
import { outputFormats, remoteTools } from '../src/lib/remote-types';
import { FREE_STORAGE_LIMIT } from '../src/lib/cloud-types';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import sharp from 'sharp';
import jsQR from 'jsqr';

const pdf = await PDFDocument.create();
pdf.addPage([144, 72]).drawText('Saved on mobile', { x: 10, y: 30, size: 10 });
const bytes = Buffer.from(await pdf.save());
const upload = { name: 'report.pdf', mimeType: 'application/pdf', buffer: bytes };
const emptyStorage = {
  limit: FREE_STORAGE_LIMIT,
  used: 0,
  available: FREE_STORAGE_LIMIT,
  full: false,
  recovery: [],
};

test.beforeEach(async ({ page }) => {
  await watchDownloads(page);
  await mockGoogle(page);
  await page.route('**/api/account/access', (route) =>
    route.fulfill({
      json: {
        pro: true,
        admin: false,
        trial: false,
        expiresAt: null,
        cancelAtPeriodEnd: false,
        billingReady: false,
      },
    }),
  );
  // Account and provider transport is mocked; the real UI and browser save path run normally.
  await page.route('https://folio-auth-tests.example.test/storage/v1/**', (route) => {
    if (!route.request().url().includes('/folio-recovery')) return route.fallback();
    return route.request().method() === 'GET'
      ? route.fulfill({ status: 404, json: { error: 'not_found' } })
      : route.fulfill({ json: { Key: 'fixture-draft' } });
  });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

for (const tool of remoteTools)
  test(`${tool} preserves the original and the prepared export MIME, filename and bytes`, async ({
    page,
  }) => {
    const format = outputFormats[tool];
    // Conversion correctness belongs to provider tests; these bytes expose delivery corruption or a wrong MIME.
    const zip = new JSZip().file('download-fixture.txt', `Prepared ${format.label} fixture`);
    const output =
      tool === 'translate-pdf' ? bytes : await zip.generateAsync({ type: 'nodebuffer' });
    const filename = `report-converted.${format.extension}`;
    await page.route('**/api/capabilities', (route) =>
      route.fulfill({ json: { tools: { [tool]: true } } }),
    );
    await page.route('**/api/documents/process', (route) =>
      route.fulfill({
        json: {
          tool,
          artifact: 'download-test-artifact',
          filename,
          size: output.length,
          pages: 1,
          expiresAt: Date.now() + 86400000,
          source: 'auto',
          target: 'es',
          ...(tool === 'translate-pdf'
            ? {
                preview: {
                  preview:
                    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j26kAAAAASUVORK5CYII=',
                  width: 1,
                  height: 1,
                  page: 0,
                },
              }
            : {}),
        },
      }),
    );
    await page.route('**/api/documents/export', async (route) => {
      expect(route.request().headers().authorization).toMatch(/^Bearer /);
      await route.fulfill({ body: output, contentType: format.mime });
    });
    await page.goto(`/${tool}`);
    await page.locator('input[type=file]').first().setInputFiles(upload);
    expect((await saveDownload(page, 'Save original', 'application/pdf')).bytes).toEqual(bytes);
    await page
      .getByRole('button', {
        name: tool === 'translate-pdf' ? 'Translate PDF' : `Convert to ${format.label}`,
        exact: true,
      })
      .click();
    const file = await saveDownload(page, `Download ${format.label}`, format.mime);
    expect(file.name).toBe(filename);
    expect(file.bytes).toEqual(output);
  });

test('password protection delivers the server response and can save the original copy', async ({
  page,
}) => {
  // Protection itself is covered by the PDF engine tests; here verify delivery of its response.
  await page.route('**/api/pro/pdf', async (route) => {
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    await route.fulfill({ body: bytes, contentType: 'application/pdf' });
  });
  await page.goto('/protect-pdf');
  await page.locator('input[type=file]').setInputFiles(upload);
  const original = await saveDownload(page, 'Download current copy', 'application/pdf');
  expect(original.name).toBe('report.pdf');
  expect(original.bytes).toEqual(bytes);
  await page.getByLabel('Opening password', { exact: true }).fill('mobile-test-password');
  await page.getByLabel('Confirm password', { exact: true }).fill('mobile-test-password');
  const file = await saveDownload(page, 'Protect & download', 'application/pdf');
  expect(file.name).toBe('report-protected.pdf');
  expect(file.bytes).toEqual(bytes);
});

test('My files downloads retain cloud file names and contents', async ({ page }) => {
  const id = '00000000-0000-4000-8000-000000000010';
  const name = 'Client proposal.pdf';
  await page.route('**/api/account/files{,?**}', (route) =>
    route.fulfill({
      json: {
        files: [
          {
            id,
            name,
            size: bytes.length,
            status: 'ready',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        total: 1,
        readyCount: 1,
        storage: emptyStorage,
      },
    }),
  );
  await page.route(`**/api/account/files/${id}`, (route) =>
    route.fulfill({ json: { name, path: `account/${id}.pdf` } }),
  );
  await page.route(
    `https://folio-auth-tests.example.test/storage/v1/object/folio-documents/account/${id}.pdf`,
    (route) => route.fulfill({ body: bytes, contentType: 'application/pdf' }),
  );
  await page.goto('/dashboard?view=files');
  const file = await saveDownload(page, `Download ${name}`, 'application/pdf');
  expect(file.name).toBe(name);
  expect(file.bytes).toEqual(bytes);
});

test('new and saved short links download scannable PNG and SVG codes', async ({ page }) => {
  const url = 'http://127.0.0.1:3001/s/mobile-link';
  const link = {
    id: '00000000-0000-4000-8000-000000000010',
    alias: 'mobile-link',
    title: 'Mobile launch',
    destination: 'https://example.com/launch',
    shortUrl: url,
    custom: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await page.route('**/api/account/links{,?**,/**}', (route) =>
    route.fulfill({
      json:
        route.request().method() === 'POST'
          ? { link }
          : { links: [link], total: 1, used: 1, limit: 1000 },
    }),
  );
  await page.goto('/url-shortener');
  await page.getByLabel('Destination URL', { exact: true }).fill(link.destination);
  await page.getByRole('button', { name: 'Shorten link', exact: true }).click();
  for (const location of ['new', 'saved']) {
    if (location === 'saved') await page.goto('/dashboard?view=links');
    await page.getByRole('button', { name: 'Generate QR', exact: true }).click();
    for (const format of ['PNG', 'SVG']) {
      const file = await saveDirectDownload(
        page,
        format,
        format === 'PNG' ? 'image/png' : 'image/svg+xml',
      );
      expect(file.name).toBe(`folio-mobile-link.${format.toLowerCase()}`);
      const { data, info } = await sharp(file.bytes)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data).toBe(url);
    }
  }
});

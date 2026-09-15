import { PDFDocument, StandardFonts } from 'pdf-lib';
import { test, expect } from './fixtures/editor-storage';
import type { Request } from '@playwright/test';
import { disableBrowserTextPreview } from './fixtures/text-preview-worker';

function inspectionPage(request: Request): number | undefined {
  const body = request.postDataBuffer()?.toString() || '';
  const job = body.match(/\{"operation":"inspect","page":(\d+)\}/);
  return job ? Number(job[1]) : undefined;
}

async function document(pages = 3) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) {
    const page = pdf.addPage([595, 842]);
    if (i !== 2) page.drawText(`Editable page ${i + 1}`, { x: 60, y: 700, size: 20, font });
  }
  return {
    name: 'Prepared pages.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await pdf.save()),
  };
}

test('text preparation begins on open and a slow response does not disable the editor toolbar', async ({
  page,
}) => {
  await disableBrowserTextPreview(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route('**/api/pro/preview', async (route) => {
    if (inspectionPage(route.request()) === 0) {
      requested = true;
      await held;
    }
    await route.continue();
  });
  try {
    await page.goto('/workspace');
    await page.locator('.editor-empty input[type=file]').setInputFiles(await document());
    await expect.poll(() => requested).toBe(true);
    const edit = page.getByRole('button', { name: 'Edit original text', exact: true });
    await edit.click();
    await expect(edit).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Add text', exact: true })).toBeEnabled();
    await expect(page.locator('#canvas-instruction')).toContainText(
      'Preparing editable text on this page',
    );
    release();
    await expect(
      page.getByRole('button', { name: 'Edit text: Editable page 1', exact: true }),
    ).toBeVisible();
  } finally {
    release();
  }
});

test('prepared pages activate without another inspection and partial metadata survives refresh', async ({
  page,
  workspaceStorage,
}) => {
  await disableBrowserTextPreview(page);
  const pages: number[] = [];
  page.on('request', (request) => {
    const index = inspectionPage(request);
    if (index !== undefined) pages.push(index);
  });
  await page.goto('/workspace');
  const prepared = page.waitForResponse((response) => inspectionPage(response.request()) === 0);
  await page.locator('.editor-empty input[type=file]').setInputFiles(await document());
  await (await prepared).finished();
  await expect(page.locator('.inline-text-node')).toHaveCount(1);
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Edit text: Editable page 1', exact: true }),
  ).toBeVisible();
  expect(pages).toEqual([0]);
  await page.getByRole('button', { name: 'Go to page 2', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Edit text: Editable page 2', exact: true }),
  ).toBeVisible();
  expect(pages).toEqual([0, 1]);
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  const snapshot = [...workspaceStorage.records.values()][0].snapshot!;
  expect(snapshot.inspection?.pages).toEqual([0, 1]);
  expect(snapshot.inspection?.blocks.map((block) => block.page)).toEqual([0, 1]);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Edit text: Editable page 2', exact: true }),
  ).toBeVisible();
  expect(pages).toEqual([0, 1]);
  await page.getByRole('button', { name: 'Go to page 3', exact: true }).click();
  await expect(page.locator('#canvas-instruction')).toContainText(
    'No editable text was found on this page',
  );
  await page.getByRole('button', { name: 'Go to page 1', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Edit text: Editable page 1', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Go to page 3', exact: true }).click();
  await expect(page.locator('#canvas-instruction')).toContainText(
    'No editable text was found on this page',
  );
  expect(pages).toEqual([0, 1, 2]);
});

test('off-screen thumbnails wait until they are scrolled into view', async ({ page }) => {
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles(await document(80));
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await expect(page.locator('.page-thumbnail').first().locator('canvas')).toBeVisible();
  expect(await page.locator('.page-thumbnail canvas').count()).toBeLessThan(15);
  const last = page.getByRole('button', { name: 'Go to page 80', exact: true });
  await last.scrollIntoViewIfNeeded();
  await expect(last.locator('canvas')).toBeVisible();
  expect(await page.locator('.page-thumbnail canvas').count()).toBeLessThan(20);
});

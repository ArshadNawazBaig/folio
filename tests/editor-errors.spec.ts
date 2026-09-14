import { test, expect } from './fixtures/editor-storage';

test('unavailable accessibility text does not report a failed PDF preview', async ({ page }) => {
  await page.addInitScript(() => {
    const send = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message, options) {
      // Fail only PDF.js text extraction, leaving the actual renderer running.
      if (message?.action === 'GetTextContent')
        throw new Error('Simulated text extraction failure.');
      return Reflect.apply(send, this, [message, options ?? []]);
    };
  });
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await expect(page.locator('.editable-page .pdf-canvas .sr-only')).toContainText(
    'Text is unavailable for this page.',
  );
  await expect(page.getByRole('button', { name: 'Retry preview', exact: true })).toHaveCount(0);
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
  }
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await expect(page.locator('main [role=alert]')).toHaveCount(0);
});

for (const width of [1440, 390])
  test(`preview and saving failures stay readable and retry without losing edits at ${width}px`, async ({
    page,
    workspaceStorage,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args) {
        if ((window as Window & { failPreview?: boolean }).failPreview && args[0] === '2d')
          return null;
        return Reflect.apply(getContext, this, args);
      } as typeof getContext;
    });
    await page.goto('/workspace?sample=proposal');
    await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
    workspaceStorage.failSaves = true;
    await page.getByRole('button', { name: 'Add text', exact: true }).click();
    await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
    await page.getByRole('textbox', { name: 'Edit added text', exact: true }).fill('Keep my edits');
    await page.getByRole('textbox', { name: 'Edit added text', exact: true }).press('Escape');
    await expect(page.getByRole('button', { name: 'Retry saving', exact: true })).toBeVisible();
    await page.evaluate(() => {
      (window as Window & { failPreview?: boolean }).failPreview = true;
    });
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Retry preview', exact: true })).toBeVisible();
    const alerts = page.locator('.editor-notifications [role=alert]');
    await expect(alerts).toHaveCount(2);
    const first = (await alerts.nth(0).boundingBox())!;
    const second = (await alerts.nth(1).boundingBox())!;
    const canvas = (await page.locator('.editor-body').boundingBox())!;
    const footer = (await page.locator('.editor-statusbar').boundingBox())!;
    expect(canvas.y + canvas.height).toBeCloseTo(footer.y, 0);
    for (const toast of [first, second]) {
      expect(toast.width).toBeCloseTo(width <= 700 ? width - 24 : 400, 0);
      expect(toast.x + toast.width / 2).toBeCloseTo(width / 2, 0);
    }
    expect(first.y + first.height).toBeLessThan(second.y);
    expect(footer.y - (second.y + second.height)).toBeGreaterThanOrEqual(8);
    expect(footer.y - (second.y + second.height)).toBeLessThanOrEqual(24);
    await page.screenshot({ path: `/tmp/folio-editor-errors-${width}.png`, fullPage: true });
    await page.evaluate(() => {
      (window as Window & { failPreview?: boolean }).failPreview = false;
    });
    await page.getByRole('button', { name: 'Retry preview', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Retry preview', exact: true })).toHaveCount(0);
    await expect(page.locator('.editable-page canvas')).toBeVisible();
    await expect(page.locator('.annotation-text')).toContainText('Keep my edits');
    workspaceStorage.failSaves = false;
    await page.getByRole('button', { name: 'Retry saving', exact: true }).click();
    await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
    await expect(alerts).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.editable-page canvas')).toBeVisible();
    await expect(page.locator('.annotation-text')).toContainText('Keep my edits');
    expect(workspaceStorage.uploads).toBe(1);
  });

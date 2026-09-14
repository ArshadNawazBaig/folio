import { test, expect } from './fixtures/editor-storage';
import { createLongTextPdf } from './fixtures/long-text-pdf';

test.use({ deviceScaleFactor: 2 });

test('long pages stay sharp after editing, zooming and refreshing', async ({ page }, testInfo) => {
  const failed: number[] = [];
  page.on('response', (response) => {
    if (response.url().endsWith('/api/pro/preview') && !response.ok())
      failed.push(response.status());
  });
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Long receipt.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await createLongTextPdf()),
  });
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: Long receipt', exact: true }).click();
  const input = page.getByRole('textbox', {
    name: 'Edit original text: Long receipt',
    exact: true,
  });
  await input.fill('Updated long receipt');
  await input.press('Enter');
  const preview = page.locator('.inline-pdf-preview');
  const sections = preview.locator('img');
  async function sharp() {
    await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
    await expect
      .poll(async () =>
        sections.evaluateAll(
          (images) =>
            images.length > 1 &&
            images.every((element) => {
              const img = element as HTMLImageElement;
              return img.complete && img.naturalWidth >= img.getBoundingClientRect().width * 2;
            }),
        ),
      )
      .toBe(true);
    const geometry = await sections.evaluateAll((images) =>
      images.map((image) => {
        const r = image.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      }),
    );
    for (let i = 1; i < geometry.length; i++)
      expect(Math.abs(geometry[i].top - geometry[i - 1].bottom)).toBeLessThan(0.1);
    const bounds = await preview.boundingBox();
    expect(geometry.at(-1)!.bottom - geometry[0].top).toBeCloseTo(bounds!.height, 0);
  }
  await sharp();
  await page.screenshot({ path: testInfo.outputPath('long-page-edited.png') });
  await page.getByRole('button', { name: 'Edit text: Long receipt', exact: true }).click();
  await expect(input).toHaveValue('Updated long receipt');
  const sheet = await page.locator('.editable-page').boundingBox();
  await page.mouse.move(sheet!.x + sheet!.width * 0.5, sheet!.y + 200);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -240);
  await page.keyboard.up('Control');
  await expect(page.locator('.zoom-value')).not.toHaveText('100%');
  await sharp();
  await expect(input).toBeFocused();
  await input.press('Enter');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await page.reload();
  await sharp();
  await page.getByRole('button', { name: 'Edit text: Long receipt', exact: true }).click();
  await expect(input).toHaveValue('Updated long receipt');
  await input.press('Enter');
  await page.setViewportSize({ width: 390, height: 844 });
  await sharp();
  expect(failed).toEqual([]);
});

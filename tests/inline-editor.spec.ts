import { test, expect } from './fixtures/editor-storage';
import AxeBuilder from '@axe-core/playwright';

test('original text edits inline with automatic previews, shared undo and payment only at download', async ({
  page,
}) => {
  let paidRequests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/pro/pdf')) paidRequests++;
  });
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  const added = page.getByRole('textbox', { name: 'Edit added text', exact: true });
  await expect(added).toBeFocused();
  await added.fill('Keep my annotation');
  await added.press('Escape');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const target = page.getByRole('button', { name: 'Edit text: A place to', exact: true });
  await target.click();
  const input = page.getByRole('textbox', { name: 'Edit original text: A place to', exact: true });
  await expect(input).toBeFocused();
  await input.fill('A space to');
  await input.pressSequentially(' create');
  await expect(input).toHaveValue('A space to create');
  await expect(page).toHaveURL(/\/workspace\?cloud=[a-f0-9-]+$/);
  await expect(page.getByRole('textbox', { name: 'Replacement text' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Update PDF preview/ })).toHaveCount(0);
  await expect(page.locator('.download-gate')).not.toBeVisible();
  await input.press('ControlOrMeta+z');
  await expect(input).toHaveValue('A place to');
  await input.press('ControlOrMeta+Shift+z');
  await expect(input).toHaveValue('A space to create');
  await input.press('Enter');
  await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  await expect(page.locator('.inline-pdf-preview')).toBeVisible();
  await expect(page.locator('.inline-text-pending')).toHaveCount(0);
  await expect(page.locator('.annotation-text')).toContainText('Keep my annotation');
  await page.screenshot({ path: '/tmp/folio-inline-editor-desktop.png', fullPage: true });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect(page.locator('.download-gate')).toBeVisible();
  expect(paidRequests).toBe(0);
  const viewport = page.viewportSize()!;
  for (const size of [viewport, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size);
    const gate = page.locator('.download-gate');
    const header = gate.locator('.download-gate-header');
    const body = gate.locator('.download-gate-body');
    const footer = gate.locator('.download-gate-footer');
    const bounds = (await gate.boundingBox())!;
    const headerBefore = (await header.boundingBox())!;
    const footerBefore = (await footer.boundingBox())!;
    expect(bounds.height).toBeCloseTo(size.height * 0.8, 0);
    expect((await body.boundingBox())!.height).toBeGreaterThan(40);
    await body.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const scroll = await body.evaluate((element) => ({
      top: element.scrollTop,
      maximum: element.scrollHeight - element.clientHeight,
    }));
    expect(scroll.top).toBeCloseTo(scroll.maximum, 0);
    expect((await header.boundingBox())!.y).toBeCloseTo(headerBefore.y, 0);
    expect((await footer.boundingBox())!.y).toBeCloseTo(footerBefore.y, 0);
    expect(footerBefore.y + footerBefore.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    await expect(header.getByRole('button', { name: 'Keep editing' })).toBeInViewport();
    await expect(
      footer.getByRole('button', { name: 'I’ve paid — download my PDF' }),
    ).toBeInViewport();
    await page.screenshot({ path: `/tmp/folio-download-dialog-${size.width}.png` });
  }
  await page.setViewportSize(viewport);
  await page
    .locator('.download-gate .gate-actions')
    .getByRole('button', { name: 'Keep editing', exact: true })
    .click();
  await target.click();
  await expect(input).toHaveValue('A space to create');
});

test('mouse zoom anchors to the pointer and preserves the active text input', async ({ page }) => {
  await page.goto('/workspace?sample=proposal');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Edit original text: A place to', exact: true });
  await input.fill('Zoom while typing');
  const sheet = page.locator('.editable-page');
  const before = (await sheet.boundingBox())!;
  const point = { x: before.x + before.width * 0.55, y: before.y + 250 };
  await page.mouse.move(point.x, point.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -360);
  await page.keyboard.up('Control');
  await expect(page.locator('.zoom-value')).not.toHaveText('100%');
  const after = (await sheet.boundingBox())!;
  expect(after.width).toBeGreaterThan(before.width * 1.4);
  expect(Math.abs((point.x - after.x) / after.width - 0.55)).toBeLessThan(0.015);
  expect(Math.abs((point.y - after.y) / after.height - 250 / before.height)).toBeLessThan(0.015);
  await expect(input).toHaveValue('Zoom while typing');
  await expect(input).toBeFocused();
  expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
  const zoom = await page.locator('.zoom-value').innerText();
  await page.mouse.wheel(0, 180);
  await expect(page.locator('.zoom-value')).toHaveText(zoom);
  await page.screenshot({ path: '/tmp/folio-inline-editor-zoom.png' });
  await input.press('Enter');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.zoom-value').click();
  await expect(page.locator('.page-sidebar')).toBeHidden();
  await expect(page.locator('.properties-sidebar')).toBeHidden();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Zoom while typing');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/folio-inline-editor-mobile.png', fullPage: true });
});

test('duplicated pages own independent original text changes', async ({ page }) => {
  await page.goto('/workspace?sample=proposal');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const target = page.getByRole('button', { name: 'Edit text: A place to', exact: true });
  const input = page.getByRole('textbox', { name: 'Edit original text: A place to', exact: true });
  await target.click();
  await input.fill('First copy');
  await input.press('Enter');
  await page.getByRole('button', { name: 'Duplicate page', exact: true }).click();
  await target.click();
  await expect(input).toHaveValue('First copy');
  await input.fill('Second copy');
  await input.press('Enter');
  await page.getByRole('button', { name: 'Go to page 1', exact: true }).click();
  await target.click();
  await expect(input).toHaveValue('First copy');
  await input.press('Enter');
  await page.getByRole('button', { name: 'Go to page 2', exact: true }).click();
  await target.click();
  await expect(input).toHaveValue('Second copy');
});

import { test, expect } from './fixtures/editor-storage';
import { clippedTextPdf } from './fixtures/clipped-text';

test('adjacent small lines each receive their own pointer clicks at page-fit zoom', async ({
  page,
}) => {
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Wide website.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await clippedTextPdf(1536)),
  });
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  const first = page.getByRole('button', {
    name: 'Edit text: Visible card description',
    exact: true,
  });
  const second = page.getByRole('button', { name: 'Edit text: Second visible line', exact: true });
  const one = await first.boundingBox(),
    two = await second.boundingBox();
  expect(one!.y + one!.height).toBeLessThan(two!.y);
  for (const text of [
    'Visible card description',
    'Second visible line',
    'Visible card description',
  ]) {
    await page.getByRole('button', { name: `Edit text: ${text}`, exact: true }).click();
    const input = page.getByRole('textbox', { name: `Edit original text: ${text}`, exact: true });
    await expect(input).toBeFocused();
    await input.press('Enter');
  }
});

test('clipped card text edits on the page and old workspace metadata upgrades without losing edits', async ({
  page,
  workspaceStorage,
}) => {
  await page.goto('/workspace');
  await page.locator('.editor-empty input[type=file]').setInputFiles({
    name: 'Cards.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await clippedTextPdf()),
  });
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  for (const text of [
    'Card title',
    'Visible card description',
    'Second visible line',
    'Another section',
    'Visible account details',
  ])
    await expect(
      page.getByRole('button', { name: `Edit text: ${text}`, exact: true }),
    ).toBeAttached();
  await expect(
    page.getByRole('button', { name: 'Edit text: Hidden overflow must stay hidden', exact: true }),
  ).toHaveCount(0);
  const target = page.getByRole('button', { name: 'Edit text: Card title', exact: true });
  await target.click();
  const input = page.getByRole('textbox', { name: 'Edit original text: Card title', exact: true });
  await expect(input).toBeFocused();
  await expect(input).toHaveCSS('color', 'rgb(124, 58, 237)');
  await input.fill('Updated card title');
  await input.press('Enter');
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
    'Your document has been saved.',
  );
  const record = [...workspaceStorage.records.values()][0];
  record.snapshot!.inspection!.version = 2;
  record.snapshot!.inspection!.blocks = record.snapshot!.inspection!.blocks.filter(
    (b) => b.text === 'Visible document heading',
  );
  await page.reload();
  await target.click();
  await expect(input).toHaveValue('Updated card title');
  await expect(input).toBeFocused();
  await expect(input).toHaveCSS('color', 'rgb(124, 58, 237)');
  await input.press('Enter');
  await page.getByRole('button', { name: 'Edit text: Another section', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Edit original text: Another section', exact: true })
    .fill('Another edited section');
});

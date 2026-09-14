import { test, expect } from './fixtures/editor-storage';
import { useBrowserTextPreviewOnly } from './fixtures/text-preview-worker';
import { createSubsetFontPdf } from './fixtures/subset-font-pdf';

for (const [category, style] of [
  ['Sans', 'Bold'],
  ['Serif', 'Italic'],
  ['Mono', 'BoldItalic'],
] as const) {
  test(`new characters keep the original ${category} ${style} glyphs and use matching fallbacks`, async ({
    page,
  }) => {
    await useBrowserTextPreviewOnly(page);
    await page.goto('/workspace');
    await page.locator('.editor-empty input[type=file]').setInputFiles({
      name: 'Custom font.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(await createSubsetFontPdf(category, style)),
    });
    await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
    await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
    await page.getByRole('button', { name: 'Edit text: Original receipt', exact: true }).click();
    const input = page.getByRole('textbox', {
      name: 'Edit original text: Original receipt',
      exact: true,
    });
    await input.fill('Original 4Z receipt');
    await expect(input).toHaveCSS('font-family', /FolioPdf_Mixed_/);
    const families = await input.evaluate((element) => {
      const name = getComputedStyle(element).fontFamily.replaceAll('"', '');
      return [...document.fonts]
        .filter((face) => face.family.replaceAll('"', '') === name)
        .map((face) => ({ range: face.unicodeRange, style: face.style, weight: face.weight }));
    });
    // Two disjoint ranges share one family: original glyphs and only the missing glyphs.
    expect(families).toHaveLength(2);
    expect(families[0].range).not.toBe(families[1].range);
    expect(families.every((face) => face.weight === (style.includes('Bold') ? '700' : '400'))).toBe(
      true,
    );
    expect(
      families.every((face) => face.style === (style.includes('Italic') ? 'italic' : 'normal')),
    ).toBe(true);
    await input.screenshot({ path: `/tmp/folio-matching-${category}-${style}.png` });
    await input.press('Enter');
    await page.locator('.editable-page').click({ position: { x: 20, y: 20 } });
    await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
    await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
    await expect(page.locator('.editor-notifications [role=status]')).toHaveText(
      'Your document has been saved.',
    );
    await page.reload();
    await page.getByRole('button', { name: 'Edit text: Original receipt', exact: true }).click();
    await expect(input).toHaveValue('Original 4Z receipt');
    await expect(input).toHaveCSS('font-family', /FolioPdf_Mixed_/);
    await input.press('Enter');
    await expect(page.locator('.inline-text-status')).toHaveText('Page preview updated.');
  });
}

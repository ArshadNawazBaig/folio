import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

const downloadButton = (page: Page) =>
  page.getByRole('button', { name: 'Download PNG', exact: true });

async function draw(page: Page) {
  const canvas = page.getByLabel('Draw your signature', { exact: true });
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.7);
  await page.mouse.down();
  for (const [x, y] of [
    [0.25, 0.3],
    [0.3, 0.65],
    [0.5, 0.4],
    [0.7, 0.6],
  ])
    await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 8 });
  await page.mouse.up();
}

async function pngDownload(page: Page) {
  const event = page.waitForEvent('download');
  await downloadButton(page).click();
  const file = await event;
  expect(file.suggestedFilename()).toBe('signature.png');
  return PNG.sync.read(await readFile((await file.path())!));
}

function assertTransparentInk(png: PNG, color?: number[]) {
  expect(png.width).toBeGreaterThan(24);
  expect(png.height).toBeGreaterThan(24);
  expect(png.data[3]).toBe(0);
  let transparent = 0,
    opaque = 0;
  const inkColors = new Set<string>();
  for (let i = 0; i < png.data.length; i += 4) {
    if (!png.data[i + 3]) transparent++;
    if (png.data[i + 3] === 255) {
      opaque++;
      inkColors.add([...png.data.subarray(i, i + 3)].join(','));
    }
  }
  expect(transparent).toBeGreaterThan(opaque);
  expect(opaque).toBeGreaterThan(20);
  if (color) expect([...inkColors]).toEqual([color.join(',')]);
}

test('standalone drawings download cropped transparent PNGs with the selected ink', async ({
  page,
}) => {
  await page.goto('/signature-generator');
  await expect(downloadButton(page)).toBeDisabled();
  await draw(page);
  await page.getByRole('button', { name: 'Undo stroke' }).click();
  await expect(downloadButton(page)).toBeDisabled();
  await draw(page);
  await page.getByRole('button', { name: 'Blue ink' }).click();
  const png = await pngDownload(page);
  assertTransparentInk(png, [58, 99, 139]);
  expect(png.width).toBeLessThan(800);
  await expect(page.getByRole('status').filter({ hasText: 'PNG download started' })).toBeVisible();
  await page.screenshot({ path: '/tmp/folio-signature-generator-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await expect(downloadButton(page)).toBeDisabled();
});

test('typed PNGs preserve ink and transparency, fit long names, and recover from unavailable fonts', async ({
  page,
}) => {
  await page.goto('/signature-generator');
  await page.getByRole('tab', { name: 'Type', exact: true }).click();
  const name = page.getByRole('textbox', { name: 'Your signature', exact: true });
  await name.fill('   ');
  await expect(downloadButton(page)).toBeDisabled();
  await name.fill('Alex Morgan');
  await page.route('**/api/fonts/file?*', (route) => route.fulfill({ status: 503 }));
  await page.getByRole('button', { name: 'Flowing', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Create your signature', exact: true }).getByRole('alert'),
  ).toContainText('could not load');
  await expect(downloadButton(page)).toBeDisabled();
  await page.getByRole('button', { name: 'Classic', exact: true }).click();
  await page.getByRole('button', { name: 'Green ink' }).click();
  assertTransparentInk(await pngDownload(page), [62, 104, 82]);
  await name.fill('Alexandra Jacqueline Morgan '.repeat(3).slice(0, 80));
  const long = await pngDownload(page);
  assertTransparentInk(long, [62, 104, 82]);
  expect(long.width).toBeLessThanOrEqual(2424);
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await page.getByRole('tab', { name: 'Type', exact: true }).click();
  await expect(name).toHaveValue('');
  await expect(downloadButton(page)).toBeDisabled();
});

test('image white removal is reflected in the PNG and invalid replacements cannot download stale images', async ({
  page,
}) => {
  await page.goto('/signature-generator');
  await page.getByRole('tab', { name: 'Image', exact: true }).click();
  const input = page.getByLabel('Upload signature image', { exact: true });
  const original = new PNG({ width: 240, height: 100 });
  original.data.fill(255);
  for (let x = 30; x < 210; x++)
    for (let y = 45; y < 52; y++) {
      const i = (y * 240 + x) * 4;
      original.data[i] = 32;
      original.data[i + 1] = 37;
      original.data[i + 2] = 34;
    }
  await input.setInputFiles({
    name: 'paper-signature.png',
    mimeType: 'image/png',
    buffer: PNG.sync.write(original),
  });
  const transparent = await pngDownload(page);
  assertTransparentInk(transparent, [32, 37, 34]);
  expect(transparent.width).toBe(204);
  await page.getByRole('checkbox', { name: 'Remove white background' }).uncheck();
  const opaque = await pngDownload(page);
  expect(opaque.width).toBe(264);
  expect(opaque.data[(13 * opaque.width + 13) * 4 + 3]).toBe(255);
  await input.setInputFiles({
    name: 'invalid.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not a PNG'),
  });
  await expect(
    page.getByRole('region', { name: 'Create your signature', exact: true }).getByRole('alert'),
  ).toContainText('could not be opened');
  await expect(downloadButton(page)).toBeDisabled();
  await page.getByRole('checkbox', { name: 'Remove white background' }).check();
  original.data.fill(255);
  await input.setInputFiles({
    name: 'blank.png',
    mimeType: 'image/png',
    buffer: PNG.sync.write(original),
  });
  await expect(
    page.getByRole('region', { name: 'Create your signature', exact: true }).getByRole('alert'),
  ).toContainText('No signature is visible');
  await expect(downloadButton(page)).toBeDisabled();
});

test('signature content is never uploaded or persisted, and refresh starts empty', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const writes: string[] = [];
    Object.assign(window, { signatureStorageWrites: writes });
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      writes.push(`${key}:${value}`);
      return original.call(this, key, value);
    };
    for (const method of ['put', 'add'] as const) {
      const original = IDBObjectStore.prototype[method];
      IDBObjectStore.prototype[method] = function (...args: Parameters<typeof original>) {
        writes.push(JSON.stringify(args));
        return original.apply(this, args);
      };
    }
  });
  const requests: string[] = [];
  page.on('request', (request) =>
    requests.push(`${request.method()} ${request.url()} ${request.postData() || ''}`),
  );
  await page.goto('/signature-generator');
  await page.getByRole('tab', { name: 'Type', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Your signature', exact: true })
    .fill('PrivateNameCanary928');
  await pngDownload(page);
  await page.getByRole('tab', { name: 'Draw', exact: true }).click();
  await draw(page);
  const drawing = await pngDownload(page);
  await page.getByRole('tab', { name: 'Image', exact: true }).click();
  await page.getByLabel('Upload signature image', { exact: true }).setInputFiles({
    name: 'PrivateImageCanary928.png',
    mimeType: 'image/png',
    buffer: PNG.sync.write(drawing),
  });
  await pngDownload(page);
  const writes = await page.evaluate(
    () => (window as unknown as { signatureStorageWrites: string[] }).signatureStorageWrites,
  );
  expect(writes.join(' ')).not.toMatch(
    /PrivateNameCanary928|PrivateImageCanary928|data:image\/png/,
  );
  await page.reload();
  await expect(downloadButton(page)).toBeDisabled();
  await page.getByRole('tab', { name: 'Type', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Your signature', exact: true })).toHaveValue('');
  expect(requests.join(' ')).not.toMatch(
    /PrivateNameCanary928|PrivateImageCanary928|data:image\/png|POST [^\s]*\/api\/(?:workspaces|account\/files)/,
  );
});

test('mobile supports touch drawing, keyboard tabs, accessible controls, and PNG downloads', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/signature-generator');
  const canvas = page.getByLabel('Draw your signature', { exact: true });
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  for (const [type, x, y] of [
    ['touchStart', 0.2, 0.6],
    ['touchMove', 0.5, 0.3],
    ['touchMove', 0.8, 0.6],
  ] as const)
    await client.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: [{ x: box.x + box.width * x, y: box.y + box.height * y }],
    });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await client.detach();
  assertTransparentInk(await pngDownload(page));
  await page.getByRole('tab', { name: 'Draw', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Image', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('textbox', { name: 'Your signature', exact: true }).fill('Alex Morgan');
  assertTransparentInk(await pngDownload(page));
  const violations = (
    await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  ).violations;
  expect(
    violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) })),
  ).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/folio-signature-generator-mobile.png', fullPage: true });
});

test('the tool and original guide have server-rendered content, metadata, and discovery links', async ({
  page,
  request,
}) => {
  const tool = await request.get('/signature-generator');
  expect(tool.ok()).toBe(true);
  const html = await tool.text();
  expect(html).toContain('Free Signature Generator');
  expect(html).toContain('SoftwareApplication');
  expect(html).toContain('/guides/create-transparent-signature-png');
  const article = await request.get('/guides/create-transparent-signature-png');
  expect(article.ok()).toBe(true);
  expect(await article.text()).toContain('Common signature PNG problems and practical fixes');
  await page.goto('/guides/create-transparent-signature-png');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'How to Create a Signature PNG With a Transparent Background',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/guides\/create-transparent-signature-png$/,
  );
  await page
    .getByRole('navigation', { name: 'Main navigation', exact: true })
    .getByRole('link', { name: 'Signature', exact: true })
    .click();
  await expect(downloadButton(page)).toBeVisible();
  for (const width of [1280, 1152, 1050]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

import { test, expect } from './fixtures/editor-storage';
import { mockGoogle } from './fixtures/auth';
import AxeBuilder from '@axe-core/playwright';
import { createSample } from '../src/lib/sample';
import { DEFAULT_CATALOG, DEFAULT_SETTINGS } from '../src/lib/platform';
import { FREE_STORAGE_LIMIT, PRO_STORAGE_LIMIT } from '../src/lib/cloud-types';
import { blankDraft, type BlogPost, type BlogDraft } from '../src/lib/blog';
const emptyStorage = {
  limit: FREE_STORAGE_LIMIT,
  used: 0,
  available: FREE_STORAGE_LIMIT,
  full: false,
  recovery: [],
};
test('Google creates a PKCE session, uses the customer account, and signs out', async ({
  page,
}) => {
  await mockGoogle(page);
  await page.goto('/account');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Fixture.' })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('link', { name: 'Open super admin dashboard' })).toBeHidden();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/folio-google-login-mobile.png', fullPage: true });
});
test('private storage shows plan capacity, blocks full uploads and frees space after deleting drafts', async ({
  page,
}) => {
  await mockGoogle(page);
  const MB = 1024 * 1024;
  let capacity = FREE_STORAGE_LIMIT,
    fileBytes = 80 * MB,
    recoveryBytes = 20 * MB,
    uploads = 0;
  await page.route('**/api/account/files', async (route) => {
    if (route.request().method() === 'POST') {
      uploads++;
      throw new Error('Over-limit uploads must not be sent');
    }
    const used = fileBytes + recoveryBytes;
    await route.fulfill({
      json: {
        files: [
          {
            id: '00000000-0000-4000-8000-000000000021',
            name: 'Saved proposal.pdf',
            size: fileBytes,
            status: 'ready',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        storage: {
          limit: capacity,
          used,
          available: Math.max(0, capacity - used),
          full: used >= capacity,
          recovery: recoveryBytes ? [{ slot: 'pro-text', size: recoveryBytes }] : [],
        },
      },
    });
  });
  await page.route(
    'https://folio-auth-tests.example.test/storage/v1/object/folio-recovery',
    async (route) => {
      expect(route.request().method()).toBe('DELETE');
      expect(route.request().postDataJSON().prefixes).toEqual([
        '00000000-0000-4000-8000-000000000001/pro-text.json',
      ]);
      recoveryBytes = 0;
      await route.fulfill({ json: [] });
    },
  );
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: 'My files', exact: false }).first().click();
  const upload = page.getByRole('button', { name: 'Upload PDF', exact: true });
  await expect(upload).toBeDisabled();
  await expect(page.getByRole('progressbar', { name: 'Cloud storage used' })).toHaveAttribute(
    'max',
    String(FREE_STORAGE_LIMIT),
  );
  await expect(page.getByText('100.0 MB of 100 MB', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Saved proposal.pdf', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete PDF text editing draft', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('no longer be able to restore');
  await page.getByRole('button', { name: 'Delete file', exact: true }).click();
  await expect(upload).toBeEnabled();
  await expect(page.getByRole('heading', { name: 'Recovery drafts' })).toHaveCount(0);
  await expect(page.getByText('80.0 MB of 100 MB', { exact: true })).toBeVisible();
  fileBytes = 99 * MB;
  await page.getByRole('button', { name: 'Refresh files' }).click();
  await expect(page.getByText('99.0 MB of 100 MB', { exact: true })).toBeVisible();
  await page.getByLabel('Upload PDF to cloud').setInputFiles({
    name: 'Too large.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(2 * MB),
  });
  await expect(
    page.getByRole('alert').filter({ hasText: 'not enough private storage' }),
  ).toBeVisible();
  expect(uploads).toBe(0);
  capacity = PRO_STORAGE_LIMIT;
  await page.getByRole('button', { name: 'Refresh files' }).click();
  await expect(page.getByText('99.0 MB of 1 GB', { exact: true })).toBeVisible();
  await expect(upload).toBeEnabled();
  fileBytes = 250 * MB;
  capacity = FREE_STORAGE_LIMIT;
  await page.getByRole('button', { name: 'Refresh files' }).click();
  await expect(page.getByText('250.0 MB of 100 MB', { exact: true })).toBeVisible();
  await expect(upload).toBeDisabled();
  await expect(page.getByRole('link', { name: 'Saved proposal.pdf', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

function loadingGate() {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { pending, release };
}

test('file skeletons match rows, respect reduced motion and settle on success or error', async ({
  page,
}) => {
  await mockGoogle(page);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  let gate = loadingGate(),
    fail = false;
  const files = Array.from({ length: 5 }, (_, i) => ({
    id: `00000000-0000-4000-8000-00000000002${i}`,
    name: `Project proposal ${i + 1}.pdf`,
    size: 20480,
    status: 'ready',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  await page.route('**/api/account/files', async (route) => {
    await gate.pending;
    await route.fulfill(
      fail
        ? { status: 503, json: { error: 'Files temporarily unavailable.' } }
        : { json: { files, storage: emptyStorage } },
    );
  });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/dashboard?view=files');
    const placeholders = page.locator('[data-loading-files]');
    await expect(placeholders).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Your next document belongs here.' }),
    ).toHaveCount(0);
    await expect(placeholders.getByRole('button')).toHaveCount(0);
    const before = await placeholders.locator(':scope > div').first().boundingBox();
    await page.screenshot({
      path: '/tmp/folio-skeleton-files-desktop.png',
      animations: 'disabled',
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(
      await placeholders
        .locator('[data-skeleton]')
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
    ).toBe('none');
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.screenshot({
      path: '/tmp/folio-skeleton-files-mobile.png',
      animations: 'disabled',
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    gate.release();
    await expect(placeholders).toHaveCount(0);
    const first = page.getByRole('link', { name: files[0].name, exact: true });
    await expect(first).toBeVisible();
    const after = await first.locator('..').locator('..').boundingBox();
    expect(Math.abs(before!.width - after!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(before!.height - after!.height)).toBeLessThanOrEqual(1);
    gate = loadingGate();
    await page.getByRole('button', { name: 'Refresh files' }).click();
    await expect(first).toBeVisible();
    await expect(placeholders).toHaveCount(0);
    gate.release();
    gate = loadingGate();
    fail = true;
    await page.reload();
    await expect(placeholders).toBeVisible();
    gate.release();
    await expect(placeholders).toHaveCount(0);
    await expect(page.locator('main [role=alert]')).toContainText('Files temporarily unavailable');
  } finally {
    gate.release();
  }
});

test('billing and support skeletons resolve into the matching cards and conversations', async ({
  page,
}) => {
  await mockGoogle(page);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const billing = loadingGate();
  let support = loadingGate();
  const ticket = {
    id: '00000000-0000-4000-8000-000000000090',
    subject: 'Document question',
    message: 'Please help with my document.',
    status: 'open',
    updated_at: new Date().toISOString(),
  };
  await page.route('**/api/account/billing', async (route) => {
    await billing.pending;
    await route.fulfill({ json: { hasCustomer: true, subscription: null } });
  });
  await page.route('**/api/support*', async (route) => {
    await support.pending;
    await route.fulfill({
      json: {
        tickets: [ticket],
        messages: [
          {
            id: 'reply',
            staff: true,
            message: 'We can help with that.',
            created_at: new Date().toISOString(),
          },
        ],
      },
    });
  });
  try {
    await page.goto('/dashboard?view=billing');
    await expect(
      page.getByRole('status').filter({ hasText: 'Loading billing details' }),
    ).toBeAttached();
    await page.screenshot({
      path: '/tmp/folio-skeleton-billing.png',
      animations: 'disabled',
      fullPage: true,
    });
    billing.release();
    await expect(page.getByRole('button', { name: 'Manage billing', exact: true })).toBeEnabled();
    await expect(
      page.getByRole('status').filter({ hasText: 'Loading billing details' }),
    ).toHaveCount(0);
    await page.goto('/support');
    await expect(
      page.getByRole('status').filter({ hasText: 'Loading conversations' }),
    ).toBeAttached();
    await expect(page.getByText('Your inquiries will appear here.')).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Email address' })).toHaveValue(
      'customer@example.test',
    );
    await page.screenshot({
      path: '/tmp/folio-skeleton-support.png',
      animations: 'disabled',
      fullPage: true,
    });
    support.release();
    await expect(page.getByRole('button', { name: /Document question/ })).toBeVisible();
    support = loadingGate();
    await page.getByRole('button', { name: /Document question/ }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Loading conversation…' }),
    ).toBeAttached();
    support.release();
    await expect(page.getByText('We can help with that.')).toBeVisible();
    await expect(page.locator('.support-thread [data-skeleton]')).toHaveCount(0);
    await page.getByRole('button', { name: /Document question/ }).click();
    await expect(page.getByText('We can help with that.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh support conversations' })).toBeEnabled();
  } finally {
    billing.release();
    support.release();
  }
});

test('admin skeletons replace unknown metrics and directory records while requests load', async ({
  page,
}) => {
  await mockGoogle(page, true);
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  const gate = loadingGate();
  await page.route('**/api/admin?**', async (route) => {
    await gate.pending;
    await route.fulfill({
      json: {
        catalog: DEFAULT_CATALOG,
        settings: DEFAULT_SETTINGS,
        billingReady: true,
        userDeletionReady: true,
        overview: { users: 1, paid: 0, trials: 0, operations: 0, suspended: 0, openTickets: 0 },
        users: {
          rows: [
            {
              id: '00000000-0000-4000-8000-000000000002',
              email: 'member@example.test',
              created_at: new Date().toISOString(),
              suspended: false,
              is_admin: false,
              grant_until: null,
            },
          ],
          total: 1,
        },
      },
    });
  });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload();
    await expect(page.locator('.admin-metrics [data-skeleton]')).toHaveCount(6);
    await page.screenshot({
      path: '/tmp/folio-skeleton-admin-overview.png',
      animations: 'disabled',
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Users', exact: true }).click();
    await expect(page.locator('.admin-table-scroll tbody tr')).toHaveCount(5);
    await expect(page.getByText('No users to display.')).toHaveCount(0);
    await page.screenshot({
      path: '/tmp/folio-skeleton-admin-users.png',
      animations: 'disabled',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    gate.release();
    await expect(page.getByRole('cell', { name: /member@example.test/ })).toBeVisible();
    await expect(page.locator('.admin-table-scroll [data-skeleton]')).toHaveCount(0);
  } finally {
    gate.release();
  }
});

test('editor skeleton preserves the workspace layout during refresh recovery', async ({ page }) => {
  await mockGoogle(page);
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editor-page-wrap canvas').first()).toBeVisible();
  await expect(page).toHaveURL(/cloud=/);
  const id = new URL(page.url()).searchParams.get('cloud');
  const gate = loadingGate();
  await page.route(`**/api/workspaces/${id}`, async (route) => {
    await gate.pending;
    await route.fallback();
  });
  try {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload();
    await expect(page.locator('.editor-skeleton-body')).toBeVisible();
    await expect(page.locator('.editor-empty')).toHaveCount(0);
    await page.screenshot({ path: '/tmp/folio-skeleton-editor.png', animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    // Reload at this width so the editor's normal mobile panel preferences apply.
    await page.reload();
    await expect(page.locator('.editor-skeleton-paper')).toBeVisible();
    expect((await page.locator('.editor-skeleton-paper').boundingBox())!.width).toBeGreaterThan(
      250,
    );
    await page.screenshot({
      path: '/tmp/folio-skeleton-editor-mobile.png',
      animations: 'disabled',
    });
    gate.release();
    await expect(page.locator('.editor-skeleton-body')).toHaveCount(0);
    await expect(page.locator('.editor-page-wrap canvas').first()).toBeVisible();
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect(page.locator('.editor-page-wrap .pdf-page-skeleton')).toHaveCount(0);
  } finally {
    gate.release();
  }
});

test('blog editor saves rich text, restores it after refresh, previews and publishes intentionally', async ({
  page,
}) => {
  await mockGoogle(page, true);
  const posts = new Map<string, BlogPost>();
  const live = new Map<string, BlogDraft>();
  const versions = new Map<
    string,
    { id: string; version: number; draft: BlogDraft; created_at: string }[]
  >();
  let failSave = false;
  await page.route('**/api/admin/blog**', async (route) => {
    const url = new URL(route.request().url()),
      parts = url.pathname.split('/'),
      id = parts[4],
      method = route.request().method();
    if (!id && method === 'POST') {
      const body = route.request().postDataJSON(),
        now = new Date().toISOString();
      const source = posts.get(body.sourceId);
      const p: BlogPost = {
        id: body.id,
        draft: source
          ? {
              ...source.draft,
              title: `${source.draft.title} (copy)`,
              slug: `copy-${body.id.slice(0, 8)}`,
            }
          : blankDraft(`untitled-${body.id.slice(0, 8)}`),
        status: 'draft',
        version: 1,
        published_version: null,
        published_at: null,
        public_slug: null,
        created_at: now,
        updated_at: now,
        like_count: 0,
      };
      posts.set(p.id, p);
      await route.fulfill({ status: 201, json: { post: p } });
      return;
    }
    if (!id) {
      const status = url.searchParams.get('status'),
        rows = [...posts.values()].filter((p) =>
          status === 'trashed' ? p.status === 'trashed' : p.status !== 'trashed',
        );
      await route.fulfill({ json: { posts: rows, total: rows.length } });
      return;
    }
    const p = posts.get(id)!;
    if (parts[5] === 'revisions') {
      await route.fulfill({ json: { revisions: versions.get(id) || [] } });
      return;
    }
    if (method === 'GET') {
      await route.fulfill({ json: { post: p } });
      return;
    }
    const body = route.request().postDataJSON();
    if (failSave) {
      await route.fulfill({
        status: 503,
        json: { error: 'The save could not finish. Please retry.' },
      });
      return;
    }
    if (body.version !== p.version) {
      await route.fulfill({
        status: 409,
        json: { error: 'This post changed in another tab. Your edits are still here.' },
      });
      return;
    }
    versions.set(id, [
      {
        id: crypto.randomUUID(),
        version: p.version,
        draft: structuredClone(p.draft),
        created_at: new Date().toISOString(),
      },
      ...(versions.get(id) || []),
    ]);
    p.draft = structuredClone(body.draft);
    p.version++;
    p.updated_at = new Date().toISOString();
    if (body.operation === 'publish') {
      live.set(id, structuredClone(p.draft));
      p.public_slug = p.draft.slug;
      p.status = 'published';
      p.published_version = p.version;
      p.published_at = body.publishAt || p.published_at || new Date().toISOString();
    }
    if (body.operation === 'trash') p.status = 'trashed';
    if (['restore', 'unpublish'].includes(body.operation)) p.status = 'draft';
    await route.fulfill({ json: { post: p } });
  });
  await page.goto('/admin/blog');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/admin\/blog$/);
  await page.getByRole('button', { name: 'New post', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/blog\/[0-9a-f-]+$/);
  const id = page.url().split('/').pop()!;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole('textbox', { name: 'Post title', exact: true })
    .fill('A calmer way to work with PDFs');
  const content = page.getByRole('textbox', { name: 'Post content', exact: true });
  await content.fill(
    'Create a little space for good work. Keep your documents clear, organized, and ready to share.',
  );
  await content.press('ControlOrMeta+a');
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  await expect(content.locator('strong')).toContainText('Create a little space');
  await page.getByRole('button', { name: 'Insert link', exact: true }).click();
  await page.getByRole('textbox', { name: 'Link address' }).fill('https://example.test/documents');
  await page.getByRole('button', { name: 'Apply link', exact: true }).click();
  await expect(content.locator('a')).toHaveAttribute('href', 'https://example.test/documents');
  await content.press('ArrowRight');
  await content.press('Enter');
  await page.getByRole('button', { name: 'Insert table', exact: true }).click();
  await expect(content.locator('table')).toBeVisible();
  for (const [i, heading] of ['Document', 'Purpose', 'Review'].entries()) {
    await content.locator('th').nth(i).click();
    await page.keyboard.type(heading);
  }
  await content.locator('td').first().click();
  await page.keyboard.type('A useful document');
  await page
    .getByRole('textbox', { name: 'Post excerpt', exact: true })
    .fill('A practical guide to keeping everyday documents organized.');
  await page.getByRole('textbox', { name: 'Post tags', exact: true }).fill('PDF, Productivity');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect.poll(() => posts.get(id)?.draft.title).toBe('A calmer way to work with PDFs');
  expect(posts.get(id)?.draft.slug).toBe('a-calmer-way-to-work-with-pdfs');
  expect(posts.get(id)?.draft.tags).toEqual(['PDF', 'Productivity']);
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).include('main').analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: '/tmp/folio-blog-editor-desktop.png', animations: 'disabled' });
  await page.reload();
  await expect(content.locator('strong').first()).toContainText('Create a little space');
  await expect(content.locator('table')).toContainText('A useful document');
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A calmer way to work with PDFs', exact: true }),
  ).toBeVisible();
  await expect(page.locator('article strong').first()).toContainText('Create a little space');
  await page.getByRole('button', { name: 'Write', exact: true }).click();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await page.getByRole('button', { name: 'Publish now', exact: true }).click();
  await expect.poll(() => live.get(id)?.title).toBe('A calmer way to work with PDFs');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page
    .getByRole('textbox', { name: 'Post title', exact: true })
    .fill('A private draft update');
  await expect.poll(() => posts.get(id)?.draft.title).toBe('A private draft update');
  expect(live.get(id)?.title).toBe('A calmer way to work with PDFs');
  await page.getByRole('button', { name: 'Revisions', exact: true }).click();
  await page
    .getByRole('button', { name: /Version/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Restore draft', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Post title', exact: true })).toHaveValue(
    'A calmer way to work with PDFs',
  );
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
  failSave = true;
  await page
    .getByRole('textbox', { name: 'Post title', exact: true })
    .fill('Keep these unsaved words');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'The save could not finish' }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Post title', exact: true })).toHaveValue(
    'Keep these unsaved words',
  );
  failSave = false;
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('All changes saved', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(content).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/folio-blog-editor-mobile.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Post settings', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Post excerpt', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close post settings', exact: true }).click();
  await page.getByRole('link', { name: 'All posts', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(
    page.getByRole('link', { name: 'Keep these unsaved words', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: '/tmp/folio-blog-manager.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Trash Keep these unsaved words' }).click();
  await page.getByRole('button', { name: 'Move to Trash', exact: true }).click();
  await expect.poll(() => posts.get(id)?.status).toBe('trashed');
  await page.getByRole('combobox', { name: 'Post status' }).click();
  await page.getByRole('option', { name: 'Trash', exact: true }).click();
  await page.getByRole('button', { name: 'Restore Keep these unsaved words' }).click();
  await expect.poll(() => posts.get(id)?.status).toBe('draft');
  await page.getByRole('combobox', { name: 'Post status' }).click();
  await page.getByRole('option', { name: 'All posts', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate Keep these unsaved words' }).click();
  await expect(page.getByRole('textbox', { name: 'Post title', exact: true })).toHaveValue(
    'Keep these unsaved words (copy)',
  );
  const copyId = page.url().split('/').pop()!;
  expect(posts.size).toBe(2);
  expect(posts.get(copyId)?.status).toBe('draft');
  posts.get(copyId)!.version++;
  await page
    .getByRole('textbox', { name: 'Post title', exact: true })
    .fill('Preserve my conflicting edit');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'This post changed in another tab' }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Post title', exact: true })).toHaveValue(
    'Preserve my conflicting edit',
  );
});

test('readers cannot open the blog writing workspace', async ({ page }) => {
  await mockGoogle(page);
  await page.goto('/admin/blog');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/dashboard\?notice=admin-required$/);
  await page.goto('/admin/blog');
  await expect(page.getByRole('link', { name: 'Back to your dashboard' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New post' })).toHaveCount(0);
});

test('assigned super admin can sign in and sign out from the dashboard', async ({ page }) => {
  await mockGoogle(page, true);
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeHidden();
  await expect(
    page.locator('.admin-metrics article').filter({ hasText: 'Total users' }),
  ).toContainText('3');
  await expect(page.getByRole('button', { name: 'Users', exact: true })).toBeEnabled();
  const signOut = page.getByRole('button', { name: 'Sign out', exact: true });
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(signOut).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  const logout = page.waitForRequest(
    (request) => new URL(request.url()).pathname === '/auth/v1/logout',
  );
  await signOut.click();
  expect(new URL((await logout).url()).searchParams.get('scope')).toBe('local');
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await page.goto('/admin');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await expect(signOut).toHaveCount(0);
  await expect(
    page.locator('.admin-metrics article').filter({ hasText: 'Total users' }),
  ).not.toContainText('3');
});
test('super admin activates users and confirms deletion with retry after cleanup failure', async ({
  page,
}) => {
  await mockGoogle(page, true);
  const customerId = '00000000-0000-4000-8000-000000000002';
  const account = {
    id: customerId,
    email: 'member@example.test',
    created_at: new Date().toISOString(),
    last_sign_in_at: null,
    suspended: true,
    is_admin: false,
    grant_until: null,
    deletion_pending: false,
  };
  let rows = [
    account,
    {
      ...account,
      id: '00000000-0000-4000-8000-000000000001',
      email: 'admin@example.test',
      is_admin: true,
      suspended: false,
    },
  ];
  let deletionAttempts = 0;
  const actions: Record<string, unknown>[] = [];
  await page.route('**/api/admin*', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      actions.push(body);
      expect(body.userId).toBe(customerId);
      if (body.action === 'user') {
        expect(body.operation).toBe('restore');
        account.suspended = false;
      } else {
        expect(body.action).toBe('delete_user');
        expect(body.confirmation).toBe('DELETE');
        expect(body.reason).toBe('Customer requested removal');
        deletionAttempts++;
        if (deletionAttempts === 1) {
          account.suspended = true;
          account.deletion_pending = true;
          await route.fulfill({
            status: 503,
            json: { error: 'Storage cleanup failed. Retry deletion to continue.' },
          });
          return;
        }
        rows = rows.filter((row) => row.id !== customerId);
      }
      await route.fulfill({ json: { saved: true } });
      return;
    }
    await route.fulfill({
      json: {
        catalog: DEFAULT_CATALOG,
        settings: DEFAULT_SETTINGS,
        billingReady: true,
        userDeletionReady: true,
        overview: { users: 2, paid: 0, trials: 0, operations: 0, suspended: 1, openTickets: 0 },
        users: { rows, total: rows.length },
      },
    });
  });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Users', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: 'member@example.test' });
  const protectedRow = page.getByRole('row').filter({ hasText: 'admin@example.test' });
  await expect(
    protectedRow.getByRole('button', { name: 'Delete user', exact: true }),
  ).toBeDisabled();
  await expect(protectedRow.getByRole('button', { name: 'Suspend', exact: true })).toBeDisabled();
  await row.getByRole('button', { name: 'Activate', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading')).toHaveText('Activate this user?');
  await dialog.getByRole('textbox', { name: 'Reason for this change' }).fill('Account reviewed');
  await dialog.getByRole('button', { name: 'Confirm change' }).click();
  await expect(dialog).toBeHidden();
  await expect(row.getByRole('button', { name: 'Suspend', exact: true })).toBeEnabled();
  await expect(page.getByRole('status')).toContainText('The user is active');
  await row.getByRole('button', { name: 'Delete user', exact: true }).click();
  await expect(dialog).toContainText('member@example.test');
  const confirm = dialog.getByRole('button', { name: 'Permanently delete user', exact: true });
  await expect(confirm).toBeDisabled();
  await dialog
    .getByRole('textbox', { name: 'Reason for this change' })
    .fill('Customer requested removal');
  await dialog.getByRole('textbox', { name: 'Type DELETE to confirm' }).fill('delete');
  await expect(confirm).toBeDisabled();
  expect(deletionAttempts).toBe(0);
  await dialog.getByRole('textbox', { name: 'Type DELETE to confirm' }).fill('DELETE');
  await confirm.click();
  await expect(dialog.getByRole('alert')).toContainText('Storage cleanup failed');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(row).toContainText('Deletion pending');
  await expect(row.getByRole('button', { name: 'Activate', exact: true })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await row.getByRole('button', { name: 'Retry deletion', exact: true }).click();
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('textbox', { name: 'Type DELETE to confirm' }).fill('DELETE');
  await dialog
    .getByRole('textbox', { name: 'Reason for this change' })
    .fill('Customer requested removal');
  await confirm.click();
  await expect(dialog).toBeHidden();
  await expect(row).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('permanently deleted');
  expect(actions.map((action) => action.action)).toEqual(['user', 'delete_user', 'delete_user']);
});

test('regular Google account requested admin access is kept in its own account', async ({
  page,
}) => {
  await mockGoogle(page);
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/notice=admin-required/);
  await expect(
    page.getByRole('status').filter({ hasText: 'does not have super admin access' }),
  ).toBeVisible();
  await page.goto('/admin');
  await expect(page.locator('main [role=alert]')).toContainText('Super admin access');
});
test('monthly choice survives Google sign-in', async ({ page }) => {
  await mockGoogle(page);
  await page.goto('/account?next=%2Fpricing%3Fplan%3Dmonth');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/pricing\?plan=month$/);
});
test('expired authorization codes show recovery instead of a signed-in account', async ({
  page,
}) => {
  await mockGoogle(page, false, true);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.locator('main [role=alert]')).toContainText('could not be verified');
  await expect(page).toHaveURL(/\/auth\/callback$/);
  await expect(page.getByRole('link', { name: 'Back to sign in' })).toBeVisible();
});
test('cancelled and incomplete callbacks scrub parameters and reject external destinations', async ({
  page,
}) => {
  for (const suffix of [
    '?error=access_denied&next=https://evil.test#error_description=private',
    '?next=//evil.test',
  ]) {
    await page.goto(`/auth/callback${suffix}`);
    await expect(page.locator('main [role=alert]')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/callback$/);
    await expect(page.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
      'href',
      '/account?next=%2Faccount',
    );
  }
});

test('dashboard profile persists, billing is reachable, and layouts stay accessible', async ({
  page,
}) => {
  await mockGoogle(page);
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(page.getByRole('heading', { name: 'Welcome back, Fixture.' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 1440 || width === 320) {
      expect(
        (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({ path: `/tmp/folio-dashboard-${width}.png`, fullPage: true });
    }
  }
  await page.getByRole('link', { name: 'Account settings', exact: true }).click();
  await page.getByRole('textbox', { name: 'Full name', exact: true }).fill('Arshad Nawaz');
  await page.getByRole('textbox', { name: 'Company' }).fill('North Studio');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByRole('status')).toContainText('Your profile has been saved');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Full name', exact: true })).toHaveValue(
    'Arshad Nawaz',
  );
  await expect(page.getByRole('textbox', { name: 'Company' })).toHaveValue('North Studio');
  await page.getByRole('button', { name: 'Sign out other sessions' }).click();
  const otherLogout = page.waitForRequest((r) => r.url().includes('/auth/v1/logout?scope=others'));
  await page.getByRole('button', { name: 'Confirm sign-out' }).click();
  await otherLogout;
  await expect(page.getByRole('status')).toContainText('still signed in here');
  await page.getByRole('link', { name: 'Billing & plan', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Manage billing', exact: true })).toBeDisabled();
  await page.route('**/api/account/billing', (route) =>
    route.fulfill({
      json: {
        hasCustomer: true,
        subscription: { status: 'past_due', current_period_end: null, cancel_at_period_end: false },
      },
    }),
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Manage billing', exact: true })).toBeEnabled();
  await expect(page.getByRole('status')).toContainText('payment needs attention');
  await page.route('**/api/billing/portal', (route) =>
    route.fulfill({ json: { url: 'https://evil.example.test' } }),
  );
  await page.getByRole('button', { name: 'Manage billing', exact: true }).click();
  await expect(page.locator('main [role=alert]')).toContainText('could not be verified');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('cloud library uploads, renames, downloads and opens real PDF bytes', async ({
  page,
  workspaceStorage,
}) => {
  await mockGoogle(page);
  const bytes = Buffer.from(await createSample('proposal'));
  const id = '00000000-0000-4000-8000-000000000010';
  workspaceStorage.records.set(id, {
    id,
    name: 'Client proposal.pdf',
    revision: 0,
    snapshot: null,
    bytes,
    expiresAt: null,
    updatedAt: new Date().toISOString(),
  });
  let uploaded = false,
    saved = false,
    name = 'My proposal.pdf';
  const record = () => ({
    id,
    name,
    size: bytes.length,
    status: saved ? 'ready' : 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  await page.route('**/api/account/files', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      expect(body.size).toBe(bytes.length);
      name = body.name;
      await route.fulfill({ status: 201, json: { id, path: `account/${id}.pdf` } });
    } else
      await route.fulfill({ json: { files: uploaded ? [record()] : [], storage: emptyStorage } });
  });
  await page.route(`**/api/account/files/${id}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      if (body.action === 'finish') {
        expect(uploaded).toBe(true);
        saved = true;
      } else name = body.name;
      await route.fulfill({ json: record() });
    } else if (route.request().method() === 'DELETE') {
      uploaded = false;
      saved = false;
      await route.fulfill({ json: { removed: true } });
    } else await route.fulfill({ json: { name, path: `account/${id}.pdf` } });
  });
  await page.route('https://folio-auth-tests.example.test/storage/v1/**', async (route) => {
    expect(route.request().headers().authorization).toContain('Bearer ');
    if (route.request().method() === 'POST') {
      expect(route.request().postDataBuffer()?.includes(bytes)).toBe(true);
      uploaded = true;
      await route.fulfill({ json: { Key: `folio-documents/account/${id}.pdf` } });
    } else await route.fulfill({ body: bytes, contentType: 'application/pdf' });
  });
  await page.goto('/dashboard?view=files');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/dashboard\?view=files$/);
  await page
    .getByLabel('Upload PDF to cloud', { exact: true })
    .setInputFiles({ name, mimeType: 'application/pdf', buffer: bytes });
  await expect(page.getByRole('link', { name: 'My proposal.pdf', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Rename My proposal.pdf', exact: true }).click();
  await page.getByRole('textbox', { name: 'File name', exact: true }).fill('Client proposal.pdf');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Client proposal.pdf', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search cloud files' }).fill('not present');
  await expect(page.getByRole('heading', { name: 'No matching files.' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search cloud files' }).fill('');
  await page.getByRole('combobox', { name: 'Sort files' }).click();
  await page.getByRole('option', { name: 'Name A–Z' }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Client proposal.pdf', exact: true }).click();
  const result = await downloaded;
  expect(result.suggestedFilename()).toBe('Client proposal.pdf');
  await page.getByRole('link', { name: 'Open Client proposal.pdf', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Document name', exact: true })).toHaveValue(
    'Client proposal.pdf',
  );
  await expect(page.getByRole('button', { name: 'Save to cloud', exact: true })).toBeEnabled();
  await page.goto('/dashboard?view=files');
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole('button', { name: 'Delete Client proposal.pdf', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(uploaded).toBe(true);
  await page.getByRole('button', { name: 'Delete Client proposal.pdf', exact: true }).click();
  await page.getByRole('button', { name: 'Delete file', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your next document belongs here.' }),
  ).toBeVisible();
});

test('editor cloud saves and browser draft imports include the finished PDF edits', async ({
  page,
  workspaceStorage,
}) => {
  await mockGoogle(page);
  const uploaded: Uint8Array[] = [];
  let failSave = false;
  await page.route('**/api/account/files', async (route) => {
    if (route.request().method() === 'POST') {
      if (failSave) {
        await route.fulfill({ status: 503, json: { error: 'Storage temporarily unavailable.' } });
        return;
      }
      const body = route.request().postDataJSON();
      expect(body.name).toMatch(/\.pdf$/);
      expect(body.size).toBeGreaterThan(0);
      const id = '00000000-0000-4000-8000-00000000001' + uploaded.length;
      await route.fulfill({ status: 201, json: { id, path: `account/${id}.pdf` } });
    } else await route.fulfill({ json: { files: [], storage: emptyStorage } });
  });
  await page.route('**/api/account/files/*', (route) =>
    route.fulfill({ json: { status: 'ready' } }),
  );
  await page.route('https://folio-auth-tests.example.test/storage/v1/**', async (route) => {
    if (route.request().url().includes('/object/info/folio-recovery/')) {
      await route.fulfill({ status: 404, json: { error: 'not_found' } });
      return;
    }
    expect(route.request().method()).toBe('POST');
    const request = new Request(route.request().url(), {
      method: 'POST',
      headers: route.request().headers(),
      body: new Uint8Array(route.request().postDataBuffer()!),
    });
    const form = await request.formData();
    const file = [...form.values()].find((value) => typeof value !== 'string');
    expect(file).toBeTruthy();
    if (typeof file !== 'string' && file) uploaded.push(new Uint8Array(await file.arrayBuffer()));
    await route.fulfill({ json: { Key: 'uploaded.pdf' } });
  });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editable-page canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  await page
    .getByRole('textbox', { name: 'Your text', exact: true })
    .fill('Saved across my devices');
  workspaceStorage.failSaves = true;
  await page.getByRole('button', { name: 'Save to cloud', exact: true }).click();
  await expect(page.locator('main [role=alert]')).toContainText('Storage temporarily unavailable');
  workspaceStorage.failSaves = false;
  await page.keyboard.press('ControlOrMeta+s');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await expect(page.getByRole('button', { name: 'Save locally', exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(async () => (await indexedDB.databases()).map((db) => db.name)),
  ).not.toContain('folio-local');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const { readFile } = await import('node:fs/promises');
  uploaded.push(new Uint8Array(await readFile((await (await download).path())!)));
  const { inspectPdf } = await import('../src/lib/pdf-engine');
  const inspected = await inspectPdf(uploaded[0]);
  // Seed a draft from the previous version to verify migration without reintroducing local saves.
  await page.evaluate(
    async ({ bytes, state }) => {
      const request = indexedDB.open('folio-local', 2);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('documents', { keyPath: 'id' });
        request.result.createObjectStore('summaries', { keyPath: 'id' });
      };
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction(['documents', 'summaries'], 'readwrite');
      const summary = {
        id: 'legacy',
        name: 'Earlier proposal.pdf',
        updatedAt: Date.now(),
        size: bytes.length,
        pageCount: state.pages.length,
      };
      tx.objectStore('documents').put({ ...summary, bytes: new Uint8Array(bytes), state });
      tx.objectStore('summaries').put(summary);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { bytes: Array.from(uploaded[0]), state: inspected.state },
  );
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/documents');
  await expect(page).toHaveURL(/dashboard\?view=files$/);
  await expect(page.getByRole('button', { name: 'On this device' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Review older drafts', exact: true }).click();
  failSave = true;
  await page.getByRole('button', { name: 'Move to cloud', exact: true }).click();
  await expect(page.locator('main [role=alert]')).toContainText('Storage temporarily unavailable');
  await expect(page.getByText('Earlier proposal.pdf', { exact: true })).toBeVisible();
  failSave = false;
  await page.getByRole('button', { name: 'Move to cloud', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'moved to cloud storage' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review older drafts', exact: true })).toHaveCount(
    0,
  );
  expect(uploaded.length).toBe(2);
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  for (const data of uploaded) {
    const task = getDocument({ data, useSystemFonts: true });
    const pdf = await task.promise;
    const text = await (await pdf.getPage(1)).getTextContent();
    expect(text.items.map((item) => ('str' in item ? item.str : '')).join(' ')).toContain(
      'Saved across my devices',
    );
    await task.destroy();
  }
});

for (const tool of ['pro-text', 'translate-pdf'] as const) {
  test(`signed-in ${tool} checkout recovery uses private cloud storage`, async ({ page }) => {
    await mockGoogle(page);
    const objects = new Map<string, string>();
    await page.route('https://folio-auth-tests.example.test/storage/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname.split('/folio-recovery/')[1];
      expect(route.request().headers().authorization).toContain('Bearer ');
      if (route.request().method() === 'POST') {
        expect(path).toMatch(new RegExp(`^00000000-0000-4000-8000-000000000001/${tool}\\.json$`));
        const request = new Request(route.request().url(), {
          method: 'POST',
          headers: route.request().headers(),
          body: new Uint8Array(route.request().postDataBuffer()!),
        });
        const form = await request.formData();
        const file = [...form.values()].find((value) => typeof value !== 'string');
        if (typeof file === 'string' || !file) throw new Error('Missing recovery file');
        const body = await file.text();
        expect(JSON.parse(body).expiresAt).toBeGreaterThan(Date.now());
        objects.set(path, body);
        await route.fulfill({ json: { Key: path } });
      } else if (route.request().method() === 'DELETE') {
        for (const key of route.request().postDataJSON().prefixes) objects.delete(key);
        await route.fulfill({ json: [] });
      } else if (objects.has(path))
        await route.fulfill({ body: objects.get(path), contentType: 'application/json' });
      else await route.fulfill({ status: 404, json: { message: 'Not found' } });
    });
    await page.goto('/account');
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const buffer = Buffer.from(await createSample('proposal'));
    if (tool === 'pro-text') {
      await page.goto('/edit-pdf-text');
      await page
        .locator('input[type=file]')
        .setInputFiles({ name: 'Cloud proposal.pdf', mimeType: 'application/pdf', buffer });
      await page.getByRole('button', { name: 'Upload for text editing' }).click();
      await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
      await page
        .getByRole('textbox', { name: 'Replacement text' })
        .fill('Recovered from my account');
    } else {
      await page.route('**/api/capabilities', (route) =>
        route.fulfill({ json: { tools: { 'translate-pdf': true } } }),
      );
      await page.route('**/api/documents/process', (route) =>
        route.fulfill({
          json: {
            tool,
            artifact: 'encrypted-private-result',
            filename: 'Cloud proposal-es.pdf',
            pages: 1,
            size: 1000,
            expiresAt: Date.now() + 86400000,
            source: 'auto',
            target: 'es',
          },
        }),
      );
      await page.goto('/translate-pdf');
      await page
        .locator('input[type=file]')
        .setInputFiles({ name: 'Cloud proposal.pdf', mimeType: 'application/pdf', buffer });
      await page.getByRole('button', { name: 'Translate PDF', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    await expect(
      page.getByText('Your recovery draft is saved in cloud storage.', { exact: false }),
    ).toBeVisible();
    expect(objects.size).toBe(1);
    expect(
      await page.evaluate(async () =>
        (await indexedDB.databases()).filter((db) =>
          ['folio-pro-draft', 'folio-prepared-documents'].includes(db.name || ''),
        ),
      ),
    ).toEqual([]);
    page.on('dialog', (dialog) => void dialog.accept());
    await page.reload();
    await expect(
      page.getByText(
        tool === 'pro-text'
          ? 'Recovered your edits from cloud storage.'
          : 'Recovered your prepared document from cloud storage.',
        { exact: false },
      ),
    ).toBeVisible();
    if (tool === 'pro-text') {
      await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
      await expect(page.getByRole('textbox', { name: 'Replacement text' })).toHaveValue(
        'Recovered from my account',
      );
    }
  });
}

test('inline text workspace saves privately, restores annotations and only exports after verified access', async ({
  page,
  workspaceStorage,
}) => {
  await mockGoogle(page);
  let paid = false;
  let exports = 0;
  await page.route('**/api/account/access', (route) =>
    route.fulfill({
      json: {
        pro: paid,
        admin: false,
        trial: false,
        expiresAt: null,
        cancelAtPeriodEnd: false,
        billingReady: false,
      },
    }),
  );
  await page.route('**/api/account/files', (route) =>
    route.fulfill({
      json: {
        files: [...workspaceStorage.records.values()].map((file) => ({
          ...file,
          bytes: undefined,
          snapshot: undefined,
          status: 'ready',
          size: file.bytes?.length || 1,
          created_at: file.updatedAt,
          updated_at: file.updatedAt,
        })),
        storage: emptyStorage,
      },
    }),
  );
  await page.route('**/api/pro/pdf', async (route) => {
    expect(paid).toBe(true);
    expect(route.request().headers().authorization).toContain('Bearer ');
    exports++;
    const request = new Request(route.request().url(), {
      method: 'POST',
      headers: route.request().headers(),
      body: new Uint8Array(route.request().postDataBuffer()!),
    });
    const form = await request.formData();
    const { processTextPdf } = await import('../scripts/pdf-text-engine.mjs');
    const result = await processTextPdf(
      new Uint8Array(await (form.get('file') as File).arrayBuffer()),
      JSON.parse(form.get('job') as string),
    );
    await route.fulfill({
      body: Buffer.from(result as Uint8Array),
      contentType: 'application/pdf',
    });
  });
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto('/workspace?sample=proposal');
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  await page
    .getByRole('textbox', { name: 'Edit added text', exact: true })
    .fill('Cloud annotation');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Edit original text: A place to', exact: true });
  await input.fill('Cloud original edit');
  await input.press('ControlOrMeta+s');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await expect(page).toHaveURL(/\/workspace\?cloud=/);
  expect(exports).toBe(0);
  const saved = [...workspaceStorage.records.values()][0];
  expect(saved.expiresAt).toBeNull();
  expect(saved.snapshot?.state.annotations[0].text).toBe('Cloud annotation');
  expect(JSON.stringify(saved.snapshot?.state.textChanges)).toContain('Cloud original edit');
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  async function pdfText(bytes: Uint8Array) {
    const task = getDocument({ data: bytes, useSystemFonts: true });
    const text = (await (await (await task.promise).getPage(1)).getTextContent()).items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    await task.destroy();
    return text;
  }
  expect(await pdfText(new Uint8Array(saved.bytes!))).not.toContain('Cloud original edit');
  await page.goto('/dashboard?view=files');
  await page.getByRole('link', { name: `Open ${saved.name}`, exact: true }).click();
  await expect(page.locator('.annotation-text')).toContainText('Cloud annotation');
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await expect(input).toHaveValue('Cloud original edit');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect(page.locator('.download-gate')).toBeVisible();
  expect(exports).toBe(0);
  paid = true;
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'I’ve paid — download my PDF', exact: true }).click();
  const { readFile } = await import('node:fs/promises');
  const output = new Uint8Array(await readFile((await (await event).path())!));
  expect(exports).toBe(1);
  const text = await pdfText(output);
  expect(text).toContain('Cloud original edit');
  expect(text).toContain('Cloud annotation');
  expect(text).not.toContain('A place to');
});

test('download dialog signs in through a separate tab and preserves unsaved original and added text', async ({
  page,
  context,
  workspaceStorage,
}, testInfo) => {
  await mockGoogle(context);
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  const url = page.url();
  const file = [...workspaceStorage.records.values()][0];
  expect(file.expiresAt).toBeTruthy();
  workspaceStorage.failSaves = true;
  await page.getByRole('button', { name: 'Add text', exact: true }).click();
  await page.locator('.editable-page').click({ position: { x: 90, y: 130 } });
  await page
    .getByRole('textbox', { name: 'Edit added text', exact: true })
    .fill('Keep my added text');
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Edit original text: A place to', exact: true });
  await input.fill('Keep my original edit');
  await input.press('Enter');
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const gate = page.locator('.download-gate');
  const signIn = gate.getByRole('button', { name: 'Continue with Google', exact: true });
  await expect(signIn).toBeEnabled();
  await expect(gate.getByRole('button', { name: 'I’ve paid — download my PDF' })).toBeHidden();
  await expect(gate.getByRole('button', { name: 'Checkout not available yet' })).toBeHidden();
  await gate.getByRole('button', { name: 'Monthly', exact: true }).click();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(signIn).toBeInViewport();
    expect(await gate.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    const footer = gate.locator('.download-gate-footer');
    const before = await footer.boundingBox();
    await gate.locator('.download-gate-body').evaluate((el) => el.scrollTo(0, el.scrollHeight));
    expect((await footer.boundingBox())?.y).toBe(before?.y);
    await page.screenshot({ path: testInfo.outputPath(`google-download-${width}.png`) });
  }
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 900 });
  const popupEvent = context.waitForEvent('page');
  await signIn.click();
  const popup = await popupEvent;
  await expect(gate.getByRole('button', { name: 'I’ve paid — download my PDF' })).toBeEnabled();
  await expect.poll(() => popup.isClosed()).toBe(true);
  expect(page.url()).toBe(url);
  expect(navigations).toEqual([]);
  await expect(signIn).toBeHidden();
  await expect(gate.getByRole('button', { name: 'Monthly', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(gate.getByRole('alert')).toBeHidden();
  await gate.getByRole('button', { name: 'I’ve paid — download my PDF' }).click();
  await expect(gate.getByRole('status')).toContainText('Premium access is not active yet');
  await expect(gate.getByRole('alert')).toBeHidden();
  await gate
    .locator('.gate-actions')
    .getByRole('button', { name: 'Keep editing', exact: true })
    .click();
  await expect(page.locator('.annotation-text')).toContainText('Keep my added text');
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await expect(input).toHaveValue('Keep my original edit');
  workspaceStorage.failSaves = false;
  await input.press('ControlOrMeta+s');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  expect(file.expiresAt).toBeNull();
  expect(file.snapshot?.state.annotations[0].text).toBe('Keep my added text');
  expect(JSON.stringify(file.snapshot?.state.textChanges)).toContain('Keep my original edit');
  expect(workspaceStorage.uploads).toBe(1);
  await page.reload();
  await expect(page.locator('.annotation-text')).toContainText('Keep my added text');
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await expect(input).toHaveValue('Keep my original edit');
});

test('download sign-in can retry blocked and cancelled tabs without losing prepared settings', async ({
  page,
  context,
}) => {
  await mockGoogle(context);
  let cancel = true;
  await context.route(
    'https://folio-auth-tests.example.test/auth/v1/authorize?**',
    async (route) => {
      if (!cancel) return route.fallback();
      const target = new URL(new URL(route.request().url()).searchParams.get('redirect_to')!);
      expect(target.searchParams.get('return_to')).toBe('editor');
      target.searchParams.set('error', 'access_denied');
      await route.fulfill({ status: 302, headers: { location: target.href } });
    },
  );
  await page.goto('/protect-pdf');
  await page.locator('input[type=file]').setInputFiles({
    name: 'Private proposal.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await createSample()),
  });
  await page.getByLabel('Opening password', { exact: true }).fill('keep-this-password');
  await page.getByLabel('Confirm password', { exact: true }).fill('keep-this-password');
  await page.getByRole('button', { name: 'Protect & download', exact: true }).click();
  const gate = page.locator('.download-gate');
  const google = gate.getByRole('button', { name: 'Continue with Google' });
  await expect(google).toBeEnabled();
  await page.evaluate(() => {
    Object.assign(window, { originalWindowOpen: window.open });
    window.open = () => null;
  });
  await google.click();
  await expect(gate.getByRole('alert')).toContainText('Allow a new tab for Google sign-in');
  await expect(page).toHaveURL(/\/protect-pdf$/);
  await page.evaluate(() => {
    window.open = (
      window as unknown as { originalWindowOpen: typeof window.open }
    ).originalWindowOpen;
  });
  const popupEvent = context.waitForEvent('page');
  await google.click();
  const popup = await popupEvent;
  await expect(popup.locator('.account-card').getByRole('alert')).toContainText(
    'Sign-in was cancelled',
  );
  await expect(popup).toHaveURL(/\/auth\/callback$/);
  await popup.getByRole('button', { name: 'Close this tab' }).click();
  await expect.poll(() => popup.isClosed()).toBe(true);
  await expect(google).toBeEnabled();
  await expect(gate.getByRole('alert')).toBeHidden();
  cancel = false;
  // Existing subscribers get download access only from the verified account response.
  let checks = 0;
  await context.route('**/api/account/access', async (route) => {
    expect(route.request().headers().authorization).toContain('Bearer ');
    checks++;
    await route.fulfill({
      json: {
        pro: true,
        admin: false,
        trial: false,
        expiresAt: null,
        cancelAtPeriodEnd: false,
        billingReady: false,
      },
    });
  });
  const retryEvent = context.waitForEvent('page');
  await google.click();
  const retry = await retryEvent;
  await expect(gate.getByRole('button', { name: 'Download my PDF', exact: true })).toBeEnabled();
  await expect.poll(() => retry.isClosed()).toBe(true);
  await expect(gate.getByRole('status')).toBeHidden();
  await expect(gate.getByRole('link', { name: 'Manage your Pro plan' })).toHaveAttribute(
    'target',
    '_blank',
  );
  await gate
    .locator('.gate-actions')
    .getByRole('button', { name: 'Keep editing', exact: true })
    .click();
  await expect(page.getByLabel('Opening password', { exact: true })).toHaveValue(
    'keep-this-password',
  );
  await expect(page.getByLabel('Confirm password', { exact: true })).toHaveValue(
    'keep-this-password',
  );
  expect(checks).toBeGreaterThan(0);
});

test('expired download sign-in leaves the editor open and permits retry', async ({
  page,
  context,
}) => {
  await mockGoogle(context, false, true);
  await page.goto('/workspace?sample=proposal');
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  const url = page.url();
  await page.getByRole('button', { name: 'Edit original text', exact: true }).click();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Edit original text: A place to', exact: true });
  await input.fill('Retain after expired sign-in');
  await input.press('Enter');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const gate = page.locator('.download-gate');
  const popupEvent = context.waitForEvent('page');
  await gate.getByRole('button', { name: 'Continue with Google' }).click();
  const popup = await popupEvent;
  await expect(popup.locator('.account-card').getByRole('alert')).toContainText(
    'This sign-in could not be verified',
  );
  await popup.getByRole('button', { name: 'Close this tab' }).click();
  await expect.poll(() => popup.isClosed()).toBe(true);
  expect(page.url()).toBe(url);
  await expect(gate.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  await expect(gate.getByRole('button', { name: 'I’ve paid — download my PDF' })).toBeHidden();
  await gate
    .locator('.gate-actions')
    .getByRole('button', { name: 'Keep editing', exact: true })
    .click();
  await page.getByRole('button', { name: 'Edit text: A place to', exact: true }).click();
  await expect(input).toHaveValue('Retain after expired sign-in');
});

test('a guest workspace moves into the signed-in account and retains its document URL', async ({
  page,
  workspaceStorage,
}) => {
  await mockGoogle(page);
  await page.goto('/workspace?sample=proposal');
  await expect(page).toHaveURL(/cloud=/);
  const url = page.url();
  const file = [...workspaceStorage.records.values()][0];
  expect(file.expiresAt).toBeTruthy();
  await page.goto('/account');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto(url);
  await expect(page.locator('.editor-file-title')).toContainText('All changes saved');
  await expect.poll(() => file.expiresAt).toBeNull();
  expect(workspaceStorage.uploads).toBe(1);
});

test('Lemon Squeezy checkout opens the verified hosted plan and billing portal', async ({
  page,
}) => {
  await mockGoogle(page);
  await page.route('**/api/billing/plans', (route) =>
    route.fulfill({
      json: {
        catalog: DEFAULT_CATALOG,
        plans: [
          { id: 'trial', amount: 100, currency: 'usd', label: '$1' },
          { id: 'month', amount: 2500, currency: 'usd', label: '$25' },
        ],
      },
    }),
  );
  await page.route('**/api/billing/checkout', (route) => {
    expect(route.request().postDataJSON()).toEqual({ plan: 'trial', pricingVersion: 'initial' });
    return route.fulfill({ json: { url: 'https://folio.lemonsqueezy.com/checkout/custom/test' } });
  });
  await page.route('https://folio.lemonsqueezy.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Hosted payment fixture</h1>' }),
  );
  await page.goto('/account?next=%2Fpricing');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await page.locator('.price-card.featured button.button.primary').click();
  await expect(page).toHaveURL('https://folio.lemonsqueezy.com/checkout/custom/test');
  await page.route('**/api/account/billing', (route) =>
    route.fulfill({
      json: {
        hasCustomer: true,
        subscription: {
          status: 'trialing',
          current_period_end: new Date(Date.now() + 86400000).toISOString(),
          cancel_at_period_end: false,
        },
      },
    }),
  );
  await page.route('**/api/billing/portal', (route) =>
    route.fulfill({ json: { url: 'https://folio.lemonsqueezy.com/billing?signature=test' } }),
  );
  await page.goto('/dashboard?view=billing');
  await page.getByRole('button', { name: 'Manage billing', exact: true }).click();
  await expect(page).toHaveURL('https://folio.lemonsqueezy.com/billing?signature=test');
});

test('admin pricing requires Lemon Squeezy variant IDs and preserves the pricing review', async ({
  page,
}) => {
  await mockGoogle(page, true);
  await page.route('**/api/admin?**', (route) =>
    route.fulfill({
      json: {
        catalog: { ...DEFAULT_CATALOG, monthlyPriceId: '123', trialPriceId: '124' },
        settings: DEFAULT_SETTINGS,
        billingReady: true,
        overview: { users: 1, paid: 0, trials: 0, operations: 0, suspended: 0, openTickets: 0 },
        priceHistory: [],
      },
    }),
  );
  let published = false;
  await page.route('**/api/admin', (route) => {
    const body = route.request().postDataJSON();
    expect(body.action).toBe('pricing');
    expect(body.monthlyVariantId).toBe('201');
    expect(body.trialVariantId).toBe('202');
    expect(body.pricing.monthlyAmount).toBe(2500);
    expect(body.pricing.trialAmount).toBe(100);
    published = true;
    return route.fulfill({ json: { saved: true } });
  });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.getByRole('button', { name: 'Pricing plans', exact: true }).click();
  await page.getByLabel('Lemon Squeezy monthly variant ID').fill('201');
  await page.getByLabel('Lemon Squeezy introductory variant ID').fill('202');
  await page.getByRole('button', { name: 'Review & publish pricing' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('$25/month');
  await dialog.getByLabel('Reason for this change').fill('Connect the new store variants');
  await dialog.getByRole('button', { name: 'Confirm change' }).click();
  await expect(dialog).toBeHidden();
  expect(published).toBe(true);
});

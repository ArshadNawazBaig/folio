import { test, expect } from './fixtures/editor-storage';
import { mockGoogle } from './fixtures/auth';
import AxeBuilder from '@axe-core/playwright';
import { blankDraft, type BlogPost } from '../src/lib/blog';

test('invoice calendar supports keyboard navigation, leap dates, direct entry and mobile placement', async ({
  page,
}, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-09-29T12:00:00Z'));
  await page.goto('/invoice-editor');
  const issued = page.getByRole('button', { name: 'Invoice date', exact: true });
  await expect(issued).toContainText('Sep 29, 2026');
  await expect(page.locator('input[type=date], input[type=datetime-local]')).toHaveCount(0);
  await issued.click();
  const calendar = page.getByRole('dialog', { name: 'Choose invoice date', exact: true });
  await expect(
    calendar.getByRole('button', { name: 'Tuesday, September 29, 2026', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(
    calendar.getByRole('button', { name: 'Wednesday, September 30, 2026', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('PageDown');
  await expect(
    calendar.getByRole('button', { name: 'Friday, October 30, 2026', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(issued).toBeFocused();
  await expect(issued).toContainText('Sep 29, 2026');

  await issued.click();
  await calendar.getByRole('combobox', { name: 'Calendar month' }).click();
  await page.getByRole('option', { name: 'February', exact: true }).click();
  await calendar.getByRole('combobox', { name: 'Calendar year', exact: true }).click();
  await page.getByRole('combobox', { name: 'Find calendar year', exact: true }).fill('2028');
  await page.getByRole('option', { name: '2028', exact: true }).click();
  await expect(calendar.getByRole('grid')).toHaveAccessibleName('February 2028');
  await page.screenshot({
    path: `test-results/calendar/${testInfo.project.name}-calendar.png`,
    animations: 'disabled',
  });
  expect(
    (await new AxeBuilder({ page }).include('[aria-label="Choose invoice date"]').analyze())
      .violations,
  ).toEqual([]);
  await calendar.getByRole('button', { name: 'Tuesday, February 29, 2028', exact: true }).click();
  await expect(issued).toContainText('Feb 29, 2028');
  await page.getByRole('button', { name: 'Net 7', exact: true }).click();
  const due = page.getByRole('button', { name: 'Due date', exact: true });
  await expect(due).toContainText('Mar 7, 2028');
  await due.click();
  const dueCalendar = page.getByRole('dialog', { name: 'Choose due date', exact: true });
  const typed = dueCalendar.getByRole('textbox', { name: 'Due date in YYYY-MM-DD format' });
  await typed.fill('2028-02-30');
  await dueCalendar.getByRole('button', { name: 'Apply date', exact: true }).click();
  await expect(dueCalendar.getByRole('alert')).toContainText('Enter a real date');
  await expect(due).toContainText('Mar 7, 2028');
  await typed.fill('2028-03-10');
  await typed.press('Enter');
  await expect(due).toContainText('Mar 10, 2028');
  await expect(due).toBeFocused();
  await page.setViewportSize({ width: 320, height: 568 });
  await due.click();
  const bounds = await dueCalendar.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(569);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeInViewport();
});

test('publishing uses the shared calendar and custom time dropdowns inside its native dialog', async ({
  page,
  baseURL,
}) => {
  await mockGoogle(page, true, false, baseURL);
  const id = '00000000-0000-4000-8000-000000000091';
  let publishAt: string | null = null;
  const post: BlogPost = {
    id,
    draft: {
      ...blankDraft('calendar-test'),
      title: 'A useful calendar test',
      excerpt: 'A practical test of the publishing calendar.',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'This sample article is long enough to test the publishing calendar without posting anything publicly.',
              },
            ],
          },
        ],
      },
    },
    status: 'draft',
    version: 1,
    published_version: null,
    published_at: null,
    public_slug: null,
    created_at: '2026-09-29T00:00:00Z',
    updated_at: '2026-09-29T00:00:00Z',
    like_count: 0,
  };
  await page.route(`**/api/admin/blog/${id}`, async (route) => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { post } });
    const body = route.request().postDataJSON();
    post.draft = body.draft;
    post.version++;
    if (body.operation === 'publish') {
      publishAt = body.publishAt;
      post.published_at = publishAt;
      post.published_version = post.version;
      post.public_slug = post.draft.slug;
      post.status = 'published';
    }
    return route.fulfill({ json: { post } });
  });
  await page.goto(`/admin/blog/${id}`);
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  const publish = page.getByRole('dialog', { name: 'Ready to share your story?', exact: true });
  const date = publish.getByRole('button', { name: 'Publish date', exact: true });
  await expect(
    page.locator('input[type=date], input[type=datetime-local], input[type=time]'),
  ).toHaveCount(0);
  await expect(publish.getByRole('combobox', { name: 'Hour (24-hour)' })).toBeDisabled();
  await date.click();
  let calendar = page.getByRole('dialog', { name: 'Choose publish date', exact: true });
  await calendar.getByRole('combobox', { name: 'Calendar month' }).click();
  await page.getByRole('option', { name: 'December', exact: true }).click();
  await calendar.getByRole('combobox', { name: 'Calendar year', exact: true }).click();
  await page.getByRole('combobox', { name: 'Find calendar year', exact: true }).fill('2030');
  await page.getByRole('option', { name: '2030', exact: true }).click();
  await calendar.getByRole('button', { name: 'Wednesday, December 25, 2030', exact: true }).click();
  await expect(date).toContainText('Dec 25, 2030');
  await publish.getByRole('combobox', { name: 'Hour (24-hour)' }).click();
  await page.getByRole('option', { name: '14', exact: true }).click();
  await publish.getByRole('combobox', { name: 'Minute', exact: true }).click();
  await page.getByRole('option', { name: '30', exact: true }).click();
  await date.click();
  await page.keyboard.press('Escape');
  await expect(publish).toBeVisible();
  await expect(date).toBeFocused();
  await date.click();
  calendar = page.getByRole('dialog', { name: 'Choose publish date', exact: true });
  await calendar.getByRole('button', { name: 'Clear date', exact: true }).click();
  await expect(publish.getByRole('button', { name: 'Publish now', exact: true })).toBeEnabled();
  await date.click();
  await calendar
    .getByRole('textbox', { name: 'Publish date in YYYY-MM-DD format' })
    .fill('2030-12-25');
  await calendar.getByRole('button', { name: 'Apply date', exact: true }).click();
  await publish.getByRole('combobox', { name: 'Hour (24-hour)' }).click();
  await page.getByRole('option', { name: '14', exact: true }).click();
  await publish.getByRole('combobox', { name: 'Minute', exact: true }).click();
  await page.getByRole('option', { name: '30', exact: true }).click();
  await publish.getByRole('button', { name: 'Schedule post', exact: true }).click();
  const expected = await page.evaluate(() => new Date('2030-12-25T14:30').toISOString());
  await expect.poll(() => publishAt).toBe(expected);
  await expect(publish).toHaveCount(0);
});

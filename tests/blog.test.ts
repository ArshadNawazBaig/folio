import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import {
  blogDraftSchema,
  blankDraft,
  blogSlug,
  safeBlogUrl,
  validRichContent,
  blogText,
  publicationError,
} from '../src/lib/blog';
import { safeAuthDestination, afterSignIn } from '../src/lib/auth-navigation';

test('blog content rejects unsafe links and unsupported documents while preserving rich text', () => {
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,test',
    '//evil.test',
    'https://user:pass@example.test',
    'https://example.test\n/next',
  ])
    assert.equal(safeBlogUrl(value), null);
  assert.equal(safeBlogUrl('https://example.test/guide'), 'https://example.test/guide');
  assert.equal(safeBlogUrl('/tools'), '/tools');
  assert.equal(safeBlogUrl('mailto:hello@example.test'), 'mailto:hello@example.test');
  assert.equal(safeBlogUrl('/image.png', true), null);
  assert.equal(blogSlug('A better PDF — Café & forms!'), 'a-better-pdf-cafe-forms');
  const draft = {
    ...blankDraft('good-story'),
    title: 'A good story',
    excerpt: 'A helpful introduction.',
    content: {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'A useful heading' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Your everyday documents deserve a little care.',
              marks: [{ type: 'bold' }, { type: 'link', attrs: { href: 'https://example.test' } }],
            },
          ],
        },
      ],
    },
  };
  assert.equal(blogDraftSchema.safeParse(draft).success, true);
  assert.equal(publicationError(draft), '');
  assert.match(blogText(draft.content), /heading Your everyday/);
  assert.equal(
    validRichContent({
      type: 'doc',
      content: [{ type: 'iframe', attrs: { src: 'https://example.test' } }],
    }),
    false,
  );
  assert.equal(
    validRichContent({
      type: 'doc',
      content: [
        {
          type: 'text',
          text: 'Bad',
          marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
        },
      ],
    }),
    false,
  );
  assert.equal(
    validRichContent({ type: 'doc', content: Array(5001).fill({ type: 'paragraph' }) }),
    false,
  );
  assert.equal(
    publicationError({ ...draft, cover: 'https://example.test/cover.webp' }),
    'Describe your cover image for readers using screen readers.',
  );
});
test('blog sign-in returns to the article and keeps admin destinations restricted', () => {
  assert.equal(safeAuthDestination('/blog/a-useful-story'), '/blog/a-useful-story');
  assert.equal(safeAuthDestination('/blog//evil.test'), '/account');
  assert.equal(safeAuthDestination('/blog/%2e%2e/admin'), '/account');
  assert.equal(afterSignIn('/admin/blog', false), '/dashboard?notice=admin-required');
  assert.equal(afterSignIn('/admin/blog', true), '/admin/blog');
  assert.equal(afterSignIn('/blog/a-useful-story', false), '/blog/a-useful-story');
});
test('blog server routes enforce roles, snapshots, scheduling, versions, media and likes with real SQL', async () => {
  await promisify(execFile)(
    process.execPath,
    [
      '--conditions=react-server',
      '--import',
      'tsx',
      fileURLToPath(new URL('./fixtures/blog-server.mts', import.meta.url)),
    ],
    { timeout: 60000 },
  );
});

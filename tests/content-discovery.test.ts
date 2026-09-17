import test from 'node:test';
import assert from 'node:assert/strict';
import { blogDirectory } from '../src/lib/blog-directory';
import { articleHeadings, articleToolSlugs } from '../src/lib/article-navigation';
import { guidesForTool, relatedGuides, relatedTools } from '../src/lib/related-content';
import { guides } from '../src/lib/guides';
import { tools } from '../src/lib/tools';
import type { RichNode } from '../src/lib/blog';

test('blog filters retain distinct canonical URLs and cannot index search variants', () => {
  const filtered = blogDirectory({ q: ' forms ', category: 'How to', page: '2', pageSize: '25' });
  assert.equal(filtered.canonical, '/blog?q=forms&category=How+to&page=2&pageSize=25');
  assert.equal(filtered.index, false);
  assert.equal(blogDirectory({ page: '2' }).index, true);
  assert.equal(blogDirectory({ page: '2' }).canonical, '/blog?page=2');
  assert.equal(blogDirectory({ page: ['2', '3'], q: ['first', 'second'] }).canonical, '/blog');
  assert.equal(blogDirectory({ page: '-1', pageSize: 'bogus', q: '  ' }).canonical, '/blog');
});

test('article navigation handles repeated and nested headings without duplicate fragment IDs', () => {
  const heading: RichNode = {
    type: 'heading',
    attrs: { level: 2 },
    content: [{ type: 'text', text: 'Start here' }],
  };
  const content: RichNode = {
    type: 'doc',
    content: [
      heading,
      { type: 'blockquote', content: [heading] },
      { ...heading, attrs: { level: 3 } },
    ],
  };
  assert.deepEqual(articleHeadings(content), [
    { id: 'section-article-0', text: 'Start here' },
    { id: 'section-article-1-0', text: 'Start here' },
  ]);
  const text = (href: string): RichNode => ({
    type: 'text',
    text: 'Open',
    marks: [{ type: 'link', attrs: { href } }],
  });
  assert.deepEqual(
    articleToolSlugs(
      {
        type: 'doc',
        content: [
          text('/merge-pdf'),
          text('https://folio.example/merge-pdf?source=guide'),
          text('/split-pdf#upload'),
          text('https://other.example/edit-pdf'),
          text('javascript:alert(1)'),
        ],
      },
      'https://folio.example',
    ),
    ['merge-pdf', 'split-pdf'],
  );
});

test('related reading follows the task, and recommendations never expose unavailable tools', () => {
  assert.ok(guidesForTool('edit-pdf-text').some((g) => g.slug === 'why-cant-i-edit-pdf-text'));
  const compression = guides.find((g) => g.tool === 'compress-pdf')!;
  for (const guide of relatedGuides(compression)) {
    assert.notEqual(guide.slug, compression.slug);
    const topics = new Set([compression.tool, ...(compression.relatedTools || [])]);
    assert.ok(
      guide.category === compression.category ||
        [guide.tool, ...(guide.relatedTools || [])].some((slug) => topics.has(slug)),
    );
  }
  for (const tool of tools) {
    const related = relatedTools(tool, tools);
    assert.ok(related.every((other) => other.available && other.slug !== tool.slug));
    assert.equal(new Set(related.map((other) => other.slug)).size, related.length);
  }
});

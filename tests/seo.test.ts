import test from 'node:test';
import assert from 'node:assert/strict';
import { seoConfiguration } from '../src/lib/site-config';
import { toolDirectory } from '../src/lib/tool-directory';
import { toolSearchTitle, toolSearchTitles } from '../src/lib/tool-seo';
import { tools } from '../src/lib/tools';
import { guides } from '../src/lib/guides';

test('only explicitly enabled HTTPS production sites can be indexed, even with leaked preview settings', () => {
  const env = {
    NEXT_PUBLIC_SITE_URL: 'https://folio.example/some/path',
    NEXT_PUBLIC_INDEXABLE: 'true',
    VERCEL_ENV: 'production',
  };
  assert.deepEqual(seoConfiguration(env), { siteUrl: 'https://folio.example', isIndexable: true });
  for (const VERCEL_ENV of ['preview', 'development'])
    assert.equal(seoConfiguration({ ...env, VERCEL_ENV }).isIndexable, false);
  for (const NEXT_PUBLIC_SITE_URL of [
    'http://folio.example',
    'https://localhost',
    'https://127.0.0.1',
    'https://[::1]',
  ])
    assert.equal(seoConfiguration({ ...env, NEXT_PUBLIC_SITE_URL }).isIndexable, false);
  assert.equal(seoConfiguration({ ...env, NEXT_PUBLIC_INDEXABLE: 'false' }).isIndexable, false);
});

test('directory pages expose every tool once with real URLs and normalized canonical metadata', () => {
  const first = toolDirectory(tools, {});
  assert.equal(first.tools.length, 10);
  assert.equal(first.canonical, '/tools');
  const second = toolDirectory(tools, { page: '2' });
  const third = toolDirectory(tools, { page: '3' });
  assert.equal(second.canonical, '/tools?page=2');
  assert.ok(second.index);
  assert.deepEqual(
    [...first.tools, ...second.tools, ...third.tools].map((tool) => tool.slug),
    tools.map((tool) => tool.slug),
  );
  assert.equal(toolDirectory(tools, { page: '9999' }).canonical, third.canonical);
  assert.ok(toolDirectory(tools, { page: '9999' }).outOfRange);
  assert.equal(toolDirectory(tools, { page: 'bad', pageSize: 'bad' }).canonical, '/tools');
  for (const params of [{ q: 'PDF' }, { category: 'Convert' }, { pageSize: '25' }])
    assert.equal(toolDirectory(tools, params).index, false);
  const images = toolDirectory(tools, { q: 'webp', pageSize: '25' }, true);
  assert.ok(images.total > 1);
  assert.ok(images.tools.every((tool) => tool.category === 'Convert'));
  assert.equal(images.canonical, '/convert?q=webp&pageSize=25');
});

test('tool search titles cover the catalogue and guide dates and links describe real content', () => {
  const titles = tools.map(toolSearchTitle);
  assert.equal(new Set(titles).size, tools.length);
  for (const tool of tools) {
    assert.ok(toolSearchTitles[tool.slug], tool.slug);
    assert.ok(!toolSearchTitle(tool).includes('Folio'));
    assert.ok(toolSearchTitle(tool).length < 75);
  }
  assert.ok(
    !toolSearchTitle(tools.find((tool) => tool.slug === 'create-qr-code')!).includes('PDF'),
  );
  for (const guide of guides) {
    assert.ok(guide.published <= guide.updated);
    assert.ok(guide.updated <= new Date().toISOString().slice(0, 10));
    for (const slug of [guide.tool, ...(guide.relatedTools || [])])
      assert.ok(
        tools.some((tool) => tool.available && tool.slug === slug),
        `${guide.slug}: ${slug}`,
      );
  }
});

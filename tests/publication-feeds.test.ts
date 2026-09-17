import test from 'node:test';
import assert from 'node:assert/strict';
import { publicationFeed, sitemapImage } from '../src/lib/publication-feeds';
import { contentSecurityPolicy } from '../src/lib/security-headers';

test('feeds escape XML, use real publication dates, and exclude future content', () => {
  const entry = {
    title: 'Forms & signatures <guide>',
    description: 'Use A & B.\u0000 Keep </description> as text.',
    path: '/guides/forms',
    category: 'Forms',
    published: '2026-09-14',
    updated: '2026-09-18',
  };
  const xml = publicationFeed(
    'https://folio.example',
    [entry, { ...entry, title: 'Private until tomorrow', published: '2026-09-20' }],
    new Date('2026-09-18'),
  );
  assert.ok(xml.includes('Forms &amp; signatures &lt;guide&gt;'));
  assert.ok(xml.includes('Keep &lt;/description&gt; as text.'));
  assert.ok(!xml.includes('\u0000'));
  assert.ok(!xml.includes('Private until tomorrow'));
  assert.ok(xml.includes('<pubDate>Mon, 14 Sep 2026 00:00:00 GMT</pubDate>'));
  assert.ok(xml.includes('<lastBuildDate>Fri, 18 Sep 2026 00:00:00 GMT</lastBuildDate>'));
});

test('sitemap images escape query strings and never advertise signed or private storage', () => {
  assert.deepEqual(sitemapImage('https://images.unsplash.com/photo?w=1200&auto=format'), [
    'https://images.unsplash.com/photo?w=1200&amp;auto=format',
  ]);
  assert.deepEqual(
    sitemapImage('https://storage.example/storage/v1/object/public/folio-blog/a.png'),
    ['https://storage.example/storage/v1/object/public/folio-blog/a.png'],
  );
  for (const value of [
    null,
    '',
    'javascript:alert(1)',
    'https://user:password@example.com/file.png',
    'https://storage.example/storage/v1/object/sign/documents/file.png?token=secret',
    'https://storage.example/storage/v1/object/authenticated/documents/file.png',
    'https://storage.example/storage/v1/render/image/authenticated/documents/file.png',
    'https://storage.example/file.png?X-Amz-Signature=secret',
  ])
    assert.deepEqual(sitemapImage(value), []);
});

test('production CSP allows PDF workers, WASM and configured storage without general script eval', () => {
  const production = contentSecurityPolicy({
    NODE_ENV: 'production',
    NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  });
  assert.ok(production.includes("worker-src 'self' blob:"));
  assert.ok(production.includes("'wasm-unsafe-eval'"));
  assert.ok(production.includes('https://project.supabase.co wss://project.supabase.co'));
  assert.ok(!production.includes("'unsafe-eval'"));
  assert.ok(production.includes("script-src-attr 'none'"));
  assert.ok(production.includes("frame-ancestors 'none'"));
  const development = contentSecurityPolicy({ NODE_ENV: 'development' });
  assert.ok(development.includes("'unsafe-eval'"));
  assert.ok(!development.includes('upgrade-insecure-requests'));
});

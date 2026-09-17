import test from 'node:test';
import assert from 'node:assert/strict';
import { legacyPublicRedirect } from '../src/lib/site-config';

const env = {
  VERCEL_ENV: 'production',
  NEXT_PUBLIC_SITE_URL: 'https://thebestfreepdf.com',
};
const oldOrigin = 'https://folio-pdf-kappa.vercel.app';

test('legacy public links move to the canonical origin with their paths and queries', () => {
  for (const path of [
    '/',
    '/edit-pdf',
    '/edit-pdf-text?demo=1',
    '/tools?page=2&q=PDF%20images',
    '/pricing?plan=trial',
    '/guides/how-to-edit-a-pdf',
    '/blog/how-to-sign-a-pdf',
    '/robots.txt',
    '/sitemap.xml',
  ]) {
    for (const method of ['GET', 'HEAD'])
      assert.equal(
        legacyPublicRedirect(new URL(path, oldOrigin), method, env)?.href,
        env.NEXT_PUBLIC_SITE_URL + path,
      );
  }
});

test('legacy sessions, callbacks, APIs and editor assets remain on their original origin', () => {
  for (const path of [
    '/workspace?workspace=private-file',
    '/documents',
    '/dashboard?view=files',
    '/account?next=%2Fworkspace',
    '/auth/callback?code=secret',
    '/admin/blog',
    '/support',
    '/maintenance',
    '/api/billing/webhook',
    '/api/workspaces/private-file',
    '/_next/static/chunk.js',
    '/pdfjs/worker.mjs',
    '/fonts/pdf/font.ttf',
    '/icon.svg',
  ])
    assert.equal(legacyPublicRedirect(new URL(path, oldOrigin), 'GET', env), null, path);
  assert.equal(legacyPublicRedirect(new URL('/edit-pdf', oldOrigin), 'POST', env), null);
});

test('domain migration leaves previews, localhost and the canonical domain untouched', () => {
  for (const origin of [
    env.NEXT_PUBLIC_SITE_URL,
    'http://localhost:3000',
    'https://folio-preview.vercel.app',
    'https://folio-pdf-kappa.vercel.app.attacker.example',
  ])
    assert.equal(legacyPublicRedirect(new URL('/edit-pdf', origin), 'GET', env), null);
  for (const overrides of [
    { VERCEL_ENV: 'preview' },
    { VERCEL_ENV: 'development' },
    { NEXT_PUBLIC_SITE_URL: oldOrigin },
    { NEXT_PUBLIC_SITE_URL: '' },
    { NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' },
  ])
    assert.equal(
      legacyPublicRedirect(new URL('/edit-pdf', oldOrigin), 'GET', { ...env, ...overrides }),
      null,
    );
  const unusualPath = new URL(oldOrigin + '//another.example/path');
  assert.equal(legacyPublicRedirect(unusualPath, 'GET', env)?.origin, env.NEXT_PUBLIC_SITE_URL);
});

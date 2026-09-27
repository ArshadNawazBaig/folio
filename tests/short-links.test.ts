import test from 'node:test';
import assert from 'node:assert/strict';
import { createLinkSchema, normalizeDestination } from '../src/lib/short-links';
import { safeAuthDestination } from '../src/lib/auth-navigation';
const origin = 'https://folio.example.com';

test('short links accept complete website URLs and reject unsafe schemes, credentials and redirect loops', () => {
  assert.equal(
    normalizeDestination('example.com/a?x=1&y=2#hello', origin),
    'https://example.com/a?x=1&y=2#hello',
  );
  assert.equal(normalizeDestination('http://example.com/path', origin), 'http://example.com/path');
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,hello',
    'ftp://example.com',
    'https://user:pass@example.com',
    'https://example.com/a\nb',
    'http://',
    'https://example.com/' + 'x'.repeat(2048),
    origin + '/s/abc',
    origin + '/%73/abc',
  ])
    assert.throws(() => normalizeDestination(url, origin), Error, url);
});
test('aliases normalize once and input cannot supply ownership or premium bypasses', () => {
  assert.equal(
    createLinkSchema.parse({ destination: 'example.com', alias: ' My-Link ' }).alias,
    'my-link',
  );
  assert.equal(createLinkSchema.parse({ destination: 'example.com' }).alias, '');
  for (const alias of ['ab', '-abc', 'abc-', 'abc/def', 'a'.repeat(49), 'hello world', 'école'])
    assert.equal(createLinkSchema.safeParse({ destination: 'example.com', alias }).success, false);
  assert.equal(
    createLinkSchema.safeParse({ destination: 'example.com', user_id: 'other' }).success,
    false,
  );
  assert.equal(
    createLinkSchema.safeParse({ destination: 'example.com', is_custom: false }).success,
    false,
  );
  assert.equal(safeAuthDestination('/url-shortener'), '/url-shortener');
  assert.equal(safeAuthDestination('/dashboard?view=links'), '/dashboard?view=links');
});

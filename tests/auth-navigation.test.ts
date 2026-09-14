import test from 'node:test';
import assert from 'node:assert/strict';
import {
  safeAuthDestination,
  authCallbackUrl,
  afterSignIn,
  signInHref,
} from '../src/lib/auth-navigation';
test('authentication redirects keep approved destinations and billing choices only', () => {
  for (const input of [
    undefined,
    null,
    'https://evil.test',
    '//evil.test',
    '/\\evil.test',
    '/%2f%2fevil.test',
    '/admin#secret',
    '/admin\n',
    '/api/admin',
    '/unknown',
  ])
    assert.equal(safeAuthDestination(input), '/account');
  assert.equal(
    safeAuthDestination('/pricing?plan=month&next=https://evil.test'),
    '/pricing?plan=month',
  );
  assert.equal(safeAuthDestination('/admin?role=super_admin'), '/admin');
  assert.equal(safeAuthDestination('/pricing?plan=free'), '/pricing');
  assert.equal(
    new URL(authCallbackUrl('https://folio.test', '/pricing?plan=month')).searchParams.get('next'),
    '/pricing?plan=month',
  );
  assert.equal(
    new URL(signInHref('/admin'), 'https://folio.test').searchParams.get('next'),
    '/admin',
  );
});
test('admin landing follows verified roles while preserving customer checkout intent', () => {
  assert.equal(afterSignIn('/admin', false), '/dashboard?notice=admin-required');
  assert.equal(afterSignIn('/account', true), '/admin');
  assert.equal(afterSignIn('/account', false), '/dashboard');
  assert.equal(
    safeAuthDestination('/dashboard?view=billing&user=someone-else'),
    '/dashboard?view=billing',
  );
  assert.equal(safeAuthDestination('/dashboard?view=admin'), '/dashboard');
  assert.equal(afterSignIn('/dashboard?view=files', true), '/dashboard?view=files');
  assert.equal(afterSignIn('/pricing?plan=month', true), '/pricing?plan=month');
});

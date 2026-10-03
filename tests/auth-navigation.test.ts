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
test('editor sign-in returns to its own tab without changing normal authentication redirects', () => {
  const normal = new URL(authCallbackUrl('https://folio.test', '/account'));
  assert.equal(normal.searchParams.has('return_to'), false);
  const editor = new URL(authCallbackUrl('https://folio.test', '/account', true));
  assert.equal(editor.pathname, '/auth/callback');
  assert.equal(editor.searchParams.get('return_to'), 'editor');
  assert.equal(editor.searchParams.get('next'), '/account');
});

test('translated dashboard authentication preserves supported locales and views only', () => {
  assert.equal(
    safeAuthDestination('/de/dashboard?view=settings&user=someone-else'),
    '/de/dashboard?view=settings',
  );
  assert.equal(safeAuthDestination('/ja/dashboard?view=billing'), '/ja/dashboard?view=billing');
  assert.equal(afterSignIn('/fr/dashboard?view=files', false), '/fr/dashboard?view=files');
  assert.equal(safeAuthDestination('/ko/dashboard?view=admin'), '/ko/dashboard');
  for (const path of [
    '/zz/dashboard',
    '/de/admin',
    '//evil.test/de/dashboard',
    '/de/dashboard/extra',
  ])
    assert.equal(safeAuthDestination(path), '/account');
});

test('translated account and checkout routes survive sign-in without accepting foreign destinations', () => {
  assert.equal(
    safeAuthDestination('/de/pricing?plan=month&next=https://evil.test'),
    '/de/pricing?plan=month',
  );
  assert.equal(afterSignIn('/ja/account', false), '/ja/dashboard');
  assert.equal(afterSignIn('/fr/pricing?plan=trial', true), '/fr/pricing?plan=trial');
  assert.equal(
    signInHref('/ko/pricing?plan=month'),
    '/ko/account?next=%2Fko%2Fpricing%3Fplan%3Dmonth',
  );
  assert.equal(safeAuthDestination('/de/admin'), '/account');
});

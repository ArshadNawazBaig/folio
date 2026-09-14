import { dashboardView } from './dashboard';
// Only known application destinations survive authentication redirects.
const destinations = new Set([
  '/account',
  '/dashboard',
  '/admin',
  '/pricing',
  '/support',
  '/workspace',
  '/documents',
  '/edit-pdf-text',
  '/protect-pdf',
]);
export function safeAuthDestination(value: unknown) {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\s#]/.test(value)
  )
    return '/account';
  try {
    const url = new URL(value, 'https://folio.invalid');
    if (url.pathname !== value.split('?')[0]) return '/account';
    const blogPath = /^\/blog(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(url.pathname);
    const adminBlogPath = /^\/admin\/blog(?:\/[0-9a-f-]{36})?$/.test(url.pathname);
    if (
      url.origin !== 'https://folio.invalid' ||
      (!destinations.has(url.pathname) && !blogPath && !adminBlogPath)
    )
      return '/account';
    const plan = url.searchParams.get('plan');
    if (url.pathname === '/dashboard') {
      const view = dashboardView(url.searchParams.get('view'));
      return view === 'overview' ? '/dashboard' : `/dashboard?view=${view}`;
    }
    return url.pathname === '/pricing' && (plan === 'trial' || plan === 'month')
      ? `/pricing?plan=${plan}`
      : url.pathname;
  } catch {
    return '/account';
  }
}
export function authCallbackUrl(origin: string, destination: string, returnToEditor = false) {
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('next', safeAuthDestination(destination));
  if (returnToEditor) url.searchParams.set('return_to', 'editor');
  return url.href;
}
export function afterSignIn(destination: string, isAdmin: boolean) {
  const target = safeAuthDestination(destination);
  if ((target === '/admin' || target.startsWith('/admin/')) && !isAdmin)
    return '/dashboard?notice=admin-required';
  if (target === '/account') return isAdmin ? '/admin' : '/dashboard';
  return target;
}
export function signInHref(destination: string) {
  return `/account?next=${encodeURIComponent(safeAuthDestination(destination))}`;
}

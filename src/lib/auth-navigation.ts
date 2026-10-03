import { dashboardView } from './dashboard';
import { isTranslatedPath, languagePath, splitLanguagePath } from './i18n/config';
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
  '/url-shortener',
  '/invoice-generator',
  '/invoice-editor',
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
    const { locale, path } = splitLanguagePath(url.pathname);
    const translatedDashboard = locale !== 'en' && path === '/dashboard';
    const translatedDestination =
      locale !== 'en' &&
      isTranslatedPath(path) &&
      (destinations.has(path) || /^\/blog(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(path));
    if (
      url.origin !== 'https://folio.invalid' ||
      (!destinations.has(url.pathname) && !blogPath && !adminBlogPath && !translatedDestination)
    )
      return '/account';
    const plan = url.searchParams.get('plan');
    if (url.pathname === '/invoice-editor') {
      const invoice = url.searchParams.get('invoice');
      return invoice &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoice)
        ? `/invoice-editor?invoice=${invoice}`
        : '/invoice-editor';
    }
    if (url.pathname === '/dashboard' || translatedDashboard) {
      const view = dashboardView(url.searchParams.get('view'));
      return view === 'overview' ? url.pathname : `${url.pathname}?view=${view}`;
    }
    return path === '/pricing' && (plan === 'trial' || plan === 'month')
      ? `${url.pathname}?plan=${plan}`
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
  const { locale, path } = splitLanguagePath(target);
  if (path === '/account') return isAdmin ? '/admin' : languagePath(locale, '/dashboard');
  return target;
}
export function signInHref(destination: string) {
  const target = safeAuthDestination(destination);
  const { locale } = splitLanguagePath(target.split('?')[0]);
  return `${languagePath(locale, '/account')}?next=${encodeURIComponent(target)}`;
}

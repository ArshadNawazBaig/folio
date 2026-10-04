export function seoConfiguration(env: Record<string, string | undefined>) {
  const url = new URL(env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  return {
    siteUrl: url.origin,
    isIndexable:
      env.NEXT_PUBLIC_INDEXABLE === 'true' &&
      url.protocol === 'https:' &&
      !local &&
      (!env.VERCEL_ENV || env.VERCEL_ENV === 'production'),
  };
}

// A self-hosted Next.js request URL can contain the internal listening address.
// Resolve the visitor-facing host for indexing; this is not an authorization check.
export function publicRequestHostname(headers: Headers, fallback: string) {
  const host =
    headers.get('x-folio-public-host') || headers.get('x-forwarded-host') || headers.get('host');
  if (!host) return fallback;
  try {
    return new URL(`https://${host.split(',')[0].trim()}`).hostname;
  } catch {
    return fallback;
  }
}

// Keep legacy private sessions on their original origin: browser cookies and
// OAuth state cannot be transferred by a cross-domain redirect.
export function legacyPublicRedirect(
  requestUrl: URL,
  method: string,
  env: Record<string, string | undefined>,
) {
  if (
    env.VERCEL_ENV !== 'production' ||
    !env.NEXT_PUBLIC_SITE_URL ||
    !['GET', 'HEAD'].includes(method) ||
    requestUrl.hostname !== 'folio-pdf-kappa.vercel.app'
  )
    return null;

  const destination = new URL(env.NEXT_PUBLIC_SITE_URL);
  if (destination.protocol !== 'https:' || destination.hostname === requestUrl.hostname)
    return null;

  const path = requestUrl.pathname;
  if (
    /^\/(?:api|workspace|documents|dashboard|account|admin|auth|support|maintenance|_next|pdfjs|fonts)(?:\/|$)/.test(
      path,
    ) ||
    (/\.[^/]+$/.test(path) && !['/robots.txt', '/sitemap.xml'].includes(path))
  )
    return null;

  destination.pathname = path;
  destination.search = requestUrl.search;
  destination.hash = '';
  return destination;
}

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

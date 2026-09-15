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

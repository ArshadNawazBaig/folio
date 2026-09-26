/** Static-rendering-compatible policy. Inline React hydration still needs unsafe-inline. */
export function contentSecurityPolicy(env: Record<string, string | undefined>) {
  const development = env.NODE_ENV === 'development';
  const connect = ["'self'", 'blob:', 'data:'];
  if (env.NEXT_PUBLIC_SUPABASE_URL) {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid Supabase URL');
    connect.push(url.origin, url.origin.replace(/^http/, 'ws'));
  }
  if (development) connect.push('ws:', 'wss:');
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${development ? " 'unsafe-eval' https://va.vercel-scripts.com" : ''}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    // Published blog images may be hosted on external HTTPS origins.
    "img-src 'self' https: blob: data:",
    "font-src 'self' blob: data:",
    `connect-src ${connect.join(' ')}`,
    "worker-src 'self' blob:",
    "media-src 'self' blob: data:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(development ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

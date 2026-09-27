import { adminDb } from '@/lib/server/auth';
import { aliasPattern, normalizeDestination } from '@/lib/short-links';
import { siteUrl } from '@/lib/seo';

const headers = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
};
export async function GET(_request: Request, { params }: { params: Promise<{ alias: string }> }) {
  const { alias } = await params;
  if (!aliasPattern.test(alias))
    return new Response('This short link is unavailable.', { status: 404, headers });
  try {
    const { data, error } = await adminDb().rpc('resolve_short_link', { link_alias: alias });
    if (error) throw error;
    if (!data)
      return new Response('This short link is unavailable or has been deleted.', {
        status: 404,
        headers,
      });
    return new Response(null, {
      status: 302,
      headers: { ...headers, Location: normalizeDestination(data, siteUrl) },
    });
  } catch {
    return new Response('This short link is temporarily unavailable. Please try again.', {
      status: 503,
      headers: { ...headers, 'Retry-After': '60' },
    });
  }
}

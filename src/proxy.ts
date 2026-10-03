import { NextResponse, type NextRequest } from 'next/server';
import { getServiceSettings } from '@/lib/server/platform';
import { siteUrl } from '@/lib/seo';
import { legacyPublicRedirect } from '@/lib/site-config';
import { splitLanguagePath } from '@/lib/i18n/config';
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const resourcePath = splitLanguagePath(pathname).path;
  const destination = legacyPublicRedirect(request.nextUrl, request.method, process.env);
  if (destination) return NextResponse.redirect(destination, 308);
  const next = () => {
    const response = NextResponse.next();
    // Production deployment aliases must not compete with the preferred public domain.
    if (process.env.VERCEL_ENV && request.nextUrl.hostname !== new URL(siteUrl).hostname)
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  };
  if (['/robots.txt', '/sitemap.xml'].includes(pathname) || pathname.startsWith('/s/'))
    return next();
  // Admin recovery, support, sign-in, cancellation, and signed payment events stay reachable.
  if (
    splitLanguagePath(pathname).path === '/dashboard' ||
    /^\/(admin|account|dashboard|auth|maintenance|support|security|terms|privacy)(\/|$)/.test(
      resourcePath,
    ) ||
    /^\/api\/(admin|support|account|workspaces)(\/|$)/.test(pathname) ||
    ['/api/billing/webhook', '/api/billing/portal'].includes(pathname)
  )
    return next();
  try {
    const settings = await getServiceSettings();
    if (!settings.maintenance) return next();
  } catch {
    if (!pathname.startsWith('/api/'))
      return NextResponse.rewrite(new URL('/maintenance', request.url), {
        status: 503,
        headers: { 'Retry-After': '300', 'Cache-Control': 'no-store' },
      });
    return NextResponse.json(
      { error: 'Folio is temporarily unavailable. Please try again shortly.' },
      { status: 503, headers: { 'Retry-After': '300' } },
    );
  }
  if (pathname.startsWith('/api/'))
    return NextResponse.json(
      { error: 'Folio is undergoing maintenance. Your changes remain in the editor.' },
      { status: 503, headers: { 'Retry-After': '300' } },
    );
  return NextResponse.rewrite(new URL('/maintenance', request.url), {
    status: 503,
    headers: { 'Retry-After': '300', 'Cache-Control': 'no-store' },
  });
}
export const config = {
  matcher: ['/((?!_next|pdfjs|.*\\.[^/]+$).*)', '/robots.txt', '/sitemap.xml'],
};

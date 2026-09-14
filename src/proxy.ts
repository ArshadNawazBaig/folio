import { NextResponse, type NextRequest } from 'next/server';
import { getPlatform } from '@/lib/server/platform';
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // Admin recovery, support, sign-in, cancellation, and signed payment events stay reachable.
  if (
    /^\/(admin|account|dashboard|auth|maintenance|support)(\/|$)/.test(pathname) ||
    /^\/api\/(admin|support|account|workspaces)(\/|$)/.test(pathname) ||
    ['/api/billing/webhook', '/api/billing/portal'].includes(pathname)
  )
    return NextResponse.next();
  try {
    const { settings } = await getPlatform();
    if (!settings.maintenance) return NextResponse.next();
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
export const config = { matcher: ['/((?!_next|pdfjs|.*\\.[^/]+$).*)'] };

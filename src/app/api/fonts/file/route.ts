import { findDocumentFont, loadDocumentFont } from '@/lib/server/document-fonts.mjs';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get('font') || '';
  if (!findDocumentFont(value))
    return Response.json({ error: 'Choose an available font and style.' }, { status: 400 });
  try {
    const bytes = await loadDocumentFont(value);
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'font/ttf',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return Response.json(
      { error: 'This font could not be loaded. Try again or choose another font.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

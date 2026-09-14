import { documentFontFamily, searchDocumentFonts } from '@/lib/server/document-fonts.mjs';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const family = params.get('family');
  const query = params.get('q') || '';
  const page = Number(params.get('page') || 0);
  if (
    query.length > 100 ||
    !Number.isInteger(page) ||
    page < 0 ||
    page > 100 ||
    (family && family.length > 100)
  )
    return Response.json({ error: 'Choose a valid font search.' }, { status: 400 });
  const result = family ? documentFontFamily(family) : searchDocumentFonts(query, page);
  return Response.json(result, {
    status: result ? 200 : 404,
    headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
  });
}

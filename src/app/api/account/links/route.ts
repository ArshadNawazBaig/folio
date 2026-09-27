import { adminDb, requireUser } from '@/lib/server/auth';
import { apiError, ApiError } from '@/lib/server/http';
import { requestedPage, requestedPageSize, readPage, filterLiteral } from '@/lib/server/pagination';
import { FREE_LINK_LIMIT, PRO_LINK_LIMIT } from '@/lib/short-links';
import {
  createShortLink,
  linkBody,
  linkError,
  linkFields,
  privateLinkHeaders,
  withShortUrl,
} from '@/lib/server/short-links';

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const params = new URL(request.url).searchParams;
    const q = (params.get('q') || '').trim();
    if (q.length > 120) throw new ApiError(400, 'Keep your search under 120 characters.');
    const db = adminDb();
    let query = db
      .from('short_links')
      .select(linkFields, { count: 'exact' })
      .eq('user_id', user.id);
    if (q) {
      const pattern = filterLiteral(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
      query = query.or(
        `title.ilike.${pattern},alias.ilike.${pattern},destination.ilike.${pattern}`,
      );
    }
    const [listed, used, plan] = await Promise.all([
      readPage(
        query.order('created_at', { ascending: false }).order('id'),
        requestedPage(params),
        requestedPageSize(params),
      ),
      db.from('short_links').select('id', { count: 'exact' }).eq('user_id', user.id).limit(0),
      db.rpc('short_link_pro', { actor: user.id }),
    ]);
    linkError(listed.error);
    linkError(used.error);
    linkError(plan.error);
    return Response.json(
      {
        links: (listed.data || []).map(withShortUrl),
        total: listed.count || 0,
        used: used.count || 0,
        limit: plan.data ? PRO_LINK_LIMIT : FREE_LINK_LIMIT,
      },
      { headers: privateLinkHeaders },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const link = await createShortLink(user.id, await linkBody(request));
    return Response.json({ link }, { status: 201, headers: privateLinkHeaders });
  } catch (error) {
    return apiError(error);
  }
}

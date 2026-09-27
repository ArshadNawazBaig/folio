import { z } from 'zod';
import { adminDb, requireUser } from '@/lib/server/auth';
import { apiError, ApiError } from '@/lib/server/http';
import { linkBody, linkError, privateLinkHeaders, withShortUrl } from '@/lib/server/short-links';

type Context = { params: Promise<{ id: string }> };
async function ownedId(context: Context) {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) throw new ApiError(400, 'Choose a valid saved link.');
  return id;
}
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser(request),
      id = await ownedId(context);
    const body = await linkBody(request, true);
    const { data, error } = await adminDb().rpc('update_short_link', {
      actor: user.id,
      link_id: id,
      link_destination: body.destination,
      link_title: body.title,
    });
    linkError(error);
    return Response.json({ link: withShortUrl(data) }, { headers: privateLinkHeaders });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireUser(request),
      id = await ownedId(context);
    const { error } = await adminDb().rpc('delete_short_link', { actor: user.id, link_id: id });
    linkError(error);
    return new Response(null, { status: 204, headers: privateLinkHeaders });
  } catch (error) {
    return apiError(error);
  }
}

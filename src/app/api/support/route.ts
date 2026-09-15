import { z } from 'zod';
import { adminDb, requireUser } from '@/lib/server/auth';
import { ApiError, apiError, boundedBody } from '@/lib/server/http';
import { publicLimit } from '@/lib/server/public-limit';
import { databaseError } from '@/lib/server/platform';
import { requestedPage, requestedPageSize, readPage, filterLiteral } from '@/lib/server/pagination';
const ticketSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.email().max(254),
    subject: z.string().trim().min(3).max(160),
    message: z.string().trim().min(10).max(5000),
    website: z.string().max(200).default(''),
  })
  .strict();
export async function POST(request: Request) {
  try {
    publicLimit('support');
    const parsed = ticketSchema.safeParse(
      JSON.parse((await boundedBody(request, 10 * 1024)).toString()),
    );
    if (!parsed.success)
      throw new ApiError(400, 'Add your name, email address, subject, and message.');
    if (parsed.data.website) throw new ApiError(400, 'This inquiry could not be submitted.');
    const { website: _website, ...ticket } = parsed.data;
    const user = request.headers.has('authorization')
      ? await requireUser(request, { allowSuspended: true })
      : null;
    const { data, error } = await adminDb()
      .from('support_tickets')
      .insert({
        ...ticket,
        email: user?.email || ticket.email.toLowerCase(),
        user_id: user?.id || null,
      })
      .select('id')
      .single();
    databaseError(error);
    return Response.json({ id: data!.id }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
export async function GET(request: Request) {
  try {
    const user = await requireUser(request, { allowSuspended: true });
    const db = adminDb(),
      email = user.email_confirmed_at ? user.email?.toLowerCase() : '';
    const params = new URL(request.url).searchParams;
    const page = requestedPage(params),
      messagePage = requestedPage(params, 'messagePage');
    const pageSize = requestedPageSize(params),
      messagePageSize = requestedPageSize(params, 'messagePageSize');
    const owners = `user_id.eq.${user.id}${email ? `,and(user_id.is.null,email.eq.${filterLiteral(email)})` : ''}`;
    const listed = await readPage(
      db
        .from('support_tickets')
        .select('*', { count: 'exact' })
        .or(owners)
        .order('updated_at', { ascending: false })
        .order('id'),
      page,
      pageSize,
    );
    databaseError(listed.error);
    const ticketId = params.get('ticket');
    let messages: unknown[] = [],
      messageTotal = 0,
      ticket = null;
    if (ticketId) {
      if (!z.uuid().safeParse(ticketId).success) throw new ApiError(400, 'Choose a valid inquiry.');
      const selected = await db
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .or(owners)
        .maybeSingle();
      databaseError(selected.error);
      if (!selected.data) throw new ApiError(404, 'This inquiry is not available to your account.');
      ticket = selected.data;
      const result = await readPage(
        db
          .from('support_messages')
          .select('id,ticket_id,staff,message,created_at', { count: 'exact' })
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: false })
          .order('id'),
        messagePage,
        messagePageSize,
      );
      databaseError(result.error);
      messages = result.data?.reverse() || [];
      messageTotal = result.count || 0;
    }
    return Response.json({
      tickets: listed.data || [],
      total: listed.count || 0,
      ticket,
      messages,
      messageTotal,
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(request: Request) {
  try {
    const user = await requireUser(request, { allowSuspended: true });
    publicLimit('support');
    const parsed = z
      .object({ ticket: z.uuid(), message: z.string().trim().min(1).max(5000) })
      .strict()
      .safeParse(JSON.parse((await boundedBody(request, 8 * 1024)).toString()));
    if (!parsed.success) throw new ApiError(400, 'Add a message to your inquiry.');
    const { error } = await adminDb().rpc('support_reply', {
      actor: user.id,
      verified_email: user.email_confirmed_at ? user.email || '' : '',
      ticket: parsed.data.ticket,
      reply_text: parsed.data.message,
      as_staff: false,
      next_status: 'open',
      next_priority: 'normal',
    });
    databaseError(error);
    return Response.json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}

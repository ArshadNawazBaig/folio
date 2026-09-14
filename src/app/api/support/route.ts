import { z } from 'zod';
import { adminDb, requireUser } from '@/lib/server/auth';
import { ApiError, apiError, boundedBody } from '@/lib/server/http';
import { publicLimit } from '@/lib/server/public-limit';
import { databaseError } from '@/lib/server/platform';
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
    // Union in application code avoids interpolating email text into PostgREST filters.
    const owned = await db
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50);
    databaseError(owned.error);
    const matching = email
      ? await db
          .from('support_tickets')
          .select('*')
          .is('user_id', null)
          .eq('email', email)
          .order('updated_at', { ascending: false })
          .limit(50)
      : { data: [], error: null };
    databaseError(matching.error);
    const tickets = [...(owned.data || []), ...(matching.data || [])]
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
      .slice(0, 50);
    const ticket = new URL(request.url).searchParams.get('ticket');
    let messages: unknown[] = [];
    if (ticket) {
      if (!tickets.some((t) => t.id === ticket))
        throw new ApiError(404, 'This inquiry is not available to your account.');
      const result = await db
        .from('support_messages')
        .select('id,ticket_id,staff,message,created_at')
        .eq('ticket_id', ticket)
        .order('created_at', { ascending: false })
        .limit(100);
      databaseError(result.error);
      messages = result.data?.reverse() || [];
    }
    return Response.json({ tickets, messages });
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

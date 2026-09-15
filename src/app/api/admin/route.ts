import { z } from 'zod';
import { createHash } from 'node:crypto';
import { adminAction } from '@/lib/admin-actions';
import { adminDb } from '@/lib/server/auth';
import { apiError, ApiError, boundedBody } from '@/lib/server/http';
import {
  requireAdmin,
  getPlatform,
  clearPlatformCache,
  databaseError,
} from '@/lib/server/platform';
import { changeSubscription, billingReady } from '@/lib/server/billing';
import { validateLemonVariant } from '@/lib/server/lemon-squeezy';
import { deleteUser } from '@/lib/server/delete-user';
import { databasePage } from '@/lib/pagination.mjs';
import { readPage, pageSizeSchema } from '@/lib/server/pagination';
export const runtime = 'nodejs';
const querySchema = z.object({
  view: z
    .enum(['overview', 'users', 'subscriptions', 'pricing', 'settings', 'support', 'audit'])
    .default('overview'),
  q: z.string().max(120).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  messagePage: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: pageSizeSchema,
  messagePageSize: pageSizeSchema,
  ticket: z.uuid().optional(),
  status: z.enum(['all', 'open', 'pending', 'resolved']).default('all'),
});
export async function GET(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) throw new ApiError(400, 'Choose valid dashboard filters.');
    const q = parsed.data,
      db = adminDb();
    const platform = await getPlatform(true);
    const result: Record<string, unknown> = { ...platform, billingReady: billingReady() };
    if (q.view === 'overview') {
      const { data, error } = await db.rpc('admin_overview', { actor: actor.id });
      databaseError(error);
      result.overview = data;
    }
    if (q.view === 'users' || q.view === 'subscriptions') {
      result[q.view] = await databasePage(
        q.page,
        async (page: number) => {
          const { data, error } = await db.rpc(
            q.view === 'users' ? 'admin_users' : 'admin_subscriptions',
            { actor: actor.id, query_text: q.q, page_number: page },
          );
          databaseError(error);
          return data;
        },
        q.pageSize,
      );
      if (q.view === 'users') {
        const readiness = await db.from('user_deletions').select('user_id').limit(0);
        result.userDeletionReady = !readiness.error;
      }
    }
    if (q.view === 'overview' || q.view === 'audit') {
      const { data, error, count } = await readPage(
        db
          .from('admin_audit')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .order('id'),
        q.page,
        q.pageSize,
      );
      databaseError(error);
      result.audit = data;
      result.auditTotal = count || 0;
    }
    if (q.view === 'pricing') {
      const { data, error, count } = await readPage(
        db
          .from('pricing_versions')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .order('id'),
        q.page,
        q.pageSize,
      );
      databaseError(error);
      result.priceHistory = data;
      result.priceHistoryTotal = count || 0;
    }
    if (q.view === 'support') {
      let tickets = db
        .from('support_tickets')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .order('id');
      if (q.status !== 'all') tickets = tickets.eq('status', q.status);
      const { data, error, count } = await readPage(tickets, q.page, q.pageSize);
      databaseError(error);
      result.tickets = { rows: data, total: count };
      if (q.ticket) {
        const {
          data: messages,
          error: messageError,
          count: messageCount,
        } = await readPage(
          db
            .from('support_messages')
            .select('id,ticket_id,staff,message,created_at', { count: 'exact' })
            .eq('ticket_id', q.ticket)
            .order('created_at', { ascending: false })
            .order('id'),
          q.messagePage,
          q.messagePageSize,
        );
        databaseError(messageError);
        result.messages = messages?.reverse();
        result.messageTotal = messageCount || 0;
      }
    }
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin(request);
    const parsed = adminAction.safeParse(
      JSON.parse((await boundedBody(request, 16 * 1024)).toString()),
    );
    if (!parsed.success)
      throw new ApiError(400, 'Review the form values and include a reason for the change.');
    const action = parsed.data,
      db = adminDb();
    if (action.action === 'delete_user') {
      await deleteUser(actor.id, action.userId, action.reason);
      return Response.json({ saved: true, deleted: true });
    }
    if (action.action === 'settings') {
      const { error } = await db.rpc('admin_save_settings', {
        actor: actor.id,
        settings_value: action.settings,
      });
      databaseError(error);
      clearPlatformCache();
    }
    if (action.action === 'user') {
      const { error } = await db.rpc('admin_user_action', {
        actor: actor.id,
        target_user: action.userId,
        action_name: action.operation,
        reason_text: action.reason,
        grant_days: action.days,
      });
      databaseError(error);
    }
    if (action.action === 'support') {
      const { error } = await db.rpc('support_reply', {
        actor: actor.id,
        verified_email: '',
        ticket: action.ticketId,
        reply_text: action.message,
        as_staff: true,
        next_status: action.status,
        next_priority: action.priority,
      });
      databaseError(error);
    }
    if (action.action === 'pricing' || action.action === 'subscription') {
      // Stable operation IDs make retries traceable and bind retries to one payload.
      const fingerprint = createHash('sha256').update(JSON.stringify(action)).digest('hex');
      const { data: previous, error: previousError } = await db
        .from('admin_audit')
        .select('actor_id,detail')
        .eq('id', action.requestId)
        .maybeSingle();
      databaseError(previousError);
      if (
        previous &&
        (previous.actor_id !== actor.id || previous.detail.fingerprint !== fingerprint)
      )
        throw new ApiError(409, 'This request ID was already used for a different change.');
      if (previous?.detail.completed) return Response.json({ saved: true });
      const { error: auditError } = await db.from('admin_audit').upsert(
        {
          id: action.requestId,
          actor_id: actor.id,
          action: `${action.action}.request`,
          target: action.action === 'pricing' ? action.requestId : action.subscriptionId,
          detail: { fingerprint, reason: action.reason, completed: false },
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
      databaseError(auditError);
      const { data: bound, error: boundError } = await db
        .from('admin_audit')
        .select('actor_id,detail')
        .eq('id', action.requestId)
        .single();
      databaseError(boundError);
      if (bound!.actor_id !== actor.id || bound!.detail.fingerprint !== fingerprint)
        throw new ApiError(409, 'This request ID was already used for a different change.');
      if (bound!.detail.completed) return Response.json({ saved: true });
      if (action.action === 'pricing') {
        const { data: published, error: publishedError } = await db
          .from('pricing_versions')
          .select('id')
          .eq('id', action.requestId)
          .maybeSingle();
        databaseError(publishedError);
        if (!published) {
          const { catalog } = await getPlatform(true);
          if (catalog.version !== action.expectedVersion)
            throw new ApiError(
              409,
              'Pricing changed while you were editing. Reload and review the latest plan.',
            );
          const p = action.pricing;
          const candidate = {
            ...p,
            version: action.requestId,
            monthlyPriceId: action.monthlyVariantId,
            trialPriceId: action.trialVariantId,
          };
          if (
            action.monthlyVariantId === action.trialVariantId ||
            !(await validateLemonVariant(action.monthlyVariantId, 'month', candidate)) ||
            (p.trialEnabled &&
              !(await validateLemonVariant(action.trialVariantId, 'trial', candidate)))
          )
            throw new ApiError(
              400,
              'The Lemon Squeezy variants must match these USD amounts, monthly renewal, and introductory setup fee and trial duration. Create new variants in Lemon Squeezy before publishing.',
            );
          const { error } = await db.rpc('admin_publish_pricing', {
            actor: actor.id,
            expected_version: action.expectedVersion,
            version_value: action.requestId,
            pricing: {
              ...p,
              monthlyPriceId: action.monthlyVariantId,
              trialPriceId: p.trialEnabled ? action.trialVariantId : null,
            },
          });
          if (error) {
            // A concurrent retry may have committed this exact version already.
            const check = await db
              .from('pricing_versions')
              .select('id')
              .eq('id', action.requestId)
              .maybeSingle();
            databaseError(check.error);
            if (!check.data) databaseError(error);
          }
        }
        clearPlatformCache();
      } else {
        const { data: owned, error } = await db
          .from('billing_subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', action.subscriptionId)
          .maybeSingle();
        databaseError(error);
        if (!owned) throw new ApiError(404, 'This subscription is not a Folio subscription.');
        await changeSubscription(
          action.subscriptionId,
          action.operation,
          `admin_${action.requestId}`,
        );
      }
      const { error: finishError } = await db
        .from('admin_audit')
        .update({ detail: { fingerprint, reason: action.reason, completed: true } })
        .eq('id', action.requestId);
      databaseError(finishError);
    }
    return Response.json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}

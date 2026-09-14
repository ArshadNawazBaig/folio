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
import { stripeClient, syncSubscription, billingReady } from '@/lib/server/billing';
import { deleteUser } from '@/lib/server/delete-user';
export const runtime = 'nodejs';
const querySchema = z.object({
  view: z
    .enum(['overview', 'users', 'subscriptions', 'pricing', 'settings', 'support', 'audit'])
    .default('overview'),
  q: z.string().max(120).default(''),
  page: z.coerce.number().int().min(1).max(100000).default(1),
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
    const result: Record<string, unknown> = { ...platform, stripeReady: billingReady() };
    if (q.view === 'overview') {
      const { data, error } = await db.rpc('admin_overview', { actor: actor.id });
      databaseError(error);
      result.overview = data;
    }
    if (q.view === 'users' || q.view === 'subscriptions') {
      const { data, error } = await db.rpc(
        q.view === 'users' ? 'admin_users' : 'admin_subscriptions',
        { actor: actor.id, query_text: q.q, page_number: q.page },
      );
      databaseError(error);
      result[q.view] = data;
      if (q.view === 'users') {
        const readiness = await db.from('user_deletions').select('user_id').limit(0);
        result.userDeletionReady = !readiness.error;
      }
    }
    if (q.view === 'overview' || q.view === 'audit') {
      const { data, error } = await db
        .from('admin_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .range((q.page - 1) * 25, q.page * 25 - 1);
      databaseError(error);
      result.audit = data;
    }
    if (q.view === 'pricing') {
      const { data, error } = await db
        .from('pricing_versions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15);
      databaseError(error);
      result.priceHistory = data;
    }
    if (q.view === 'support') {
      let tickets = db
        .from('support_tickets')
        .select('*', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range((q.page - 1) * 25, q.page * 25 - 1);
      if (q.status !== 'all') tickets = tickets.eq('status', q.status);
      const { data, error, count } = await tickets;
      databaseError(error);
      result.tickets = { rows: data, total: count };
      if (q.ticket) {
        const { data: messages, error: messageError } = await db
          .from('support_messages')
          .select('id,ticket_id,staff,message,created_at')
          .eq('ticket_id', q.ticket)
          .order('created_at', { ascending: false })
          .limit(100);
        databaseError(messageError);
        result.messages = messages?.reverse();
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
      // Stable operation IDs make retries traceable and bind Stripe idempotency to one payload.
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
      const stripe = stripeClient();
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
          // Pin bootstrap price IDs before switching the active catalog, so old subscribers
          // keep their purchased terms even if deployment variables are later removed.
          if (catalog.version === 'initial' && catalog.monthlyPriceId) {
            const { error: pinError } = await db
              .from('pricing_versions')
              .update({
                monthly_price_id: catalog.monthlyPriceId,
                trial_price_id: catalog.trialPriceId,
              })
              .eq('id', 'initial')
              .is('monthly_price_id', null);
            databaseError(pinError);
          }
          const p = action.pricing;
          const product = await stripe.products.create(
            { name: p.name, metadata: { folio_pricing_version: action.requestId } },
            { idempotencyKey: `folio-product-${action.requestId}` },
          );
          const monthly = await stripe.prices.create(
            {
              product: product.id,
              currency: p.currency,
              unit_amount: p.monthlyAmount,
              recurring: { interval: 'month' },
              nickname: `${p.name} monthly`,
            },
            { idempotencyKey: `folio-monthly-${action.requestId}` },
          );
          let trialId: string | null = null;
          if (p.trialEnabled) {
            const intro = await stripe.products.create(
              {
                name: `${p.name} — ${p.trialDays}-day introductory access`,
                metadata: { folio_pricing_version: action.requestId },
              },
              { idempotencyKey: `folio-intro-product-${action.requestId}` },
            );
            const trial = await stripe.prices.create(
              {
                product: intro.id,
                currency: p.currency,
                unit_amount: p.trialAmount,
                nickname: 'One-time introductory payment',
              },
              { idempotencyKey: `folio-intro-${action.requestId}` },
            );
            trialId = trial.id;
          }
          const { error } = await db.rpc('admin_publish_pricing', {
            actor: actor.id,
            expected_version: action.expectedVersion,
            version_value: action.requestId,
            pricing: { ...p, monthlyPriceId: monthly.id, trialPriceId: trialId },
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
        if (action.operation === 'cancel_now')
          await stripe.subscriptions.cancel(
            action.subscriptionId,
            { prorate: false, invoice_now: false },
            { idempotencyKey: `folio-admin-${action.requestId}` },
          );
        else
          await stripe.subscriptions.update(
            action.subscriptionId,
            { cancel_at_period_end: action.operation === 'cancel_end' },
            { idempotencyKey: `folio-admin-${action.requestId}` },
          );
        await syncSubscription(
          action.subscriptionId,
          `admin_${action.requestId}`,
          Math.floor(Date.now() / 1000),
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

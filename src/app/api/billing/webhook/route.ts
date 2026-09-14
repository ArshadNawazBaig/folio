import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { syncSubscription } from '@/lib/server/billing';
import { lemonGet } from '@/lib/server/lemon-squeezy';
import { adminDb } from '@/lib/server/auth';
import { apiError, ApiError, boundedBody } from '@/lib/server/http';
import type { LemonPayment } from '@/lib/lemon-squeezy';
export const runtime = 'nodejs';
const payloadSchema = z.object({
  meta: z.object({
    event_name: z.string(),
    custom_data: z.object({ folio_checkout: z.uuid().optional() }).passthrough().nullish(),
  }),
  data: z.object({ type: z.string(), id: z.string().regex(/^[1-9]\d*$/) }),
});
export async function POST(request: Request) {
  const observedAt = Date.now();
  try {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!secret) throw new ApiError(503, 'Billing is not connected.');
    const signature = request.headers.get('x-signature') || '';
    if (!/^[a-f0-9]{64}$/i.test(signature)) throw new ApiError(400, 'Invalid webhook signature.');
    const body = await boundedBody(request, 1_048_576);
    const expected = createHmac('sha256', secret).update(body).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex')))
      throw new ApiError(400, 'Invalid webhook signature.');
    const parsed = payloadSchema.safeParse(JSON.parse(body.toString()));
    if (!parsed.success) throw new ApiError(400, 'Invalid billing event.');
    const { meta, data } = parsed.data;
    const eventId = `lemon_${createHash('sha256').update(body).digest('hex')}`;
    let id: string | undefined;
    if (
      data.type === 'subscriptions' &&
      /^subscription_(created|updated|cancelled|resumed|expired|paused|unpaused)$/.test(
        meta.event_name,
      )
    )
      id = data.id;
    if (
      data.type === 'subscription-invoices' &&
      /^subscription_payment_(success|failed|recovered|refunded)$/.test(meta.event_name)
    ) {
      const invoice = await lemonGet<LemonPayment>('subscription-invoices', data.id);
      if (invoice.subscription_id) id = String(invoice.subscription_id);
    }
    if (data.type === 'orders' && ['order_created', 'order_refunded'].includes(meta.event_name)) {
      const found = await adminDb()
        .from('lemon_checkouts')
        .select('subscription_id')
        .eq('order_id', data.id)
        .maybeSingle();
      if (found.error) throw found.error;
      id = found.data?.subscription_id || undefined;
      if (!id && meta.custom_data?.folio_checkout) {
        const bound = await adminDb()
          .from('lemon_checkouts')
          .select('subscription_id')
          .eq('id', meta.custom_data.folio_checkout)
          .maybeSingle();
        if (bound.error) throw bound.error;
        id = bound.data?.subscription_id || undefined;
      }
    }
    if (id) await syncSubscription(id, eventId, observedAt, meta.custom_data?.folio_checkout);
    return Response.json({ received: true });
  } catch (error) {
    return apiError(error);
  }
}

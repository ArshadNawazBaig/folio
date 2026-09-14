import { stripeClient, syncSubscription } from '@/lib/server/billing';
import { apiError, ApiError, boundedBody } from '@/lib/server/http';
import type Stripe from 'stripe';
export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new ApiError(503, 'Billing is not connected.');
    const signature = request.headers.get('stripe-signature');
    if (!signature) throw new ApiError(400, 'Missing webhook signature.');
    const body = await boundedBody(request, 1_048_576);
    let event: Stripe.Event;
    try {
      event = stripeClient().webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      throw new ApiError(400, 'Invalid webhook signature.');
    }
    let subscriptionId: string | undefined;
    if (event.type.startsWith('customer.subscription.'))
      subscriptionId = (event.data.object as Stripe.Subscription).id;
    if (
      [
        'invoice.paid',
        'invoice.payment_failed',
        'invoice.voided',
        'invoice.marked_uncollectible',
      ].includes(event.type)
    ) {
      const invoice = event.data.object as Stripe.Invoice;
      const subscription = invoice.parent?.subscription_details?.subscription;
      subscriptionId = typeof subscription === 'string' ? subscription : subscription?.id;
    }
    if (
      ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(
        event.type,
      )
    ) {
      const subscription = (event.data.object as Stripe.Checkout.Session).subscription;
      subscriptionId = typeof subscription === 'string' ? subscription : subscription?.id;
    }
    if (subscriptionId) await syncSubscription(subscriptionId, event.id, event.created);
    return Response.json({ received: true });
  } catch (error) {
    return apiError(error);
  }
}

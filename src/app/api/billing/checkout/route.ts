import { z } from 'zod';
import { adminDb, requireUser } from '@/lib/server/auth';
import { availablePlans, billingReady, stripeClient } from '@/lib/server/billing';
import { apiError, ApiError, boundedBody } from '@/lib/server/http';
import { siteUrl } from '@/lib/seo';
import { checkoutOffer, usedIntroOffer } from '@/lib/billing-offers';
import { assertServiceAvailable, getPlatform } from '@/lib/server/platform';
import { money } from '@/lib/platform';
export async function POST(request: Request) {
  let unlock: (() => Promise<void>) | undefined;
  try {
    const user = await requireUser(request);
    await assertServiceAvailable();
    if (!billingReady()) throw new ApiError(503, 'Checkout is not connected yet.');
    const parsed = z
      .object({ plan: z.enum(['trial', 'month']), pricingVersion: z.string().min(1).max(80) })
      .strict()
      .safeParse(JSON.parse((await boundedBody(request, 2048)).toString()));
    if (!parsed.success)
      throw new ApiError(400, 'Choose an available introductory offer or the monthly plan.');
    const plan = parsed.data.plan;
    const { catalog } = await getPlatform(true);
    if (parsed.data.pricingVersion !== catalog.version)
      throw new ApiError(
        409,
        'Pricing has changed. Close this checkout prompt and review the current plan before buying.',
      );
    const price = catalog.monthlyPriceId!;
    if (!(await availablePlans()).some((p) => p.id === plan))
      throw new ApiError(400, 'This plan is not available.');
    const stripe = stripeClient();
    const db = adminDb();
    const { data: existing, error: lookupError } = await db
      .from('billing_customers')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    let customerId = existing?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create(
        { email: user.email, metadata: { folio_user_id: user.id } },
        { idempotencyKey: `folio-customer-${user.id}` },
      );
      const { error } = await db
        .from('billing_customers')
        .upsert(
          { user_id: user.id, stripe_customer_id: customer.id },
          { onConflict: 'user_id', ignoreDuplicates: true },
        );
      if (error) {
        // Deletion may suspend the account while customer creation is in
        // flight. Do not leave the newly created Stripe customer orphaned.
        if (error.message.includes('deletion_in_progress')) await stripe.customers.del(customer.id);
        throw error;
      }
      customerId = customer.id;
    }
    const { data: claimed, error: claimError } = await db.rpc('claim_checkout', {
      account_id: user.id,
    });
    if (claimError) throw claimError;
    if (!claimed) throw new ApiError(409, 'Checkout is already opening. Please wait a moment.');
    unlock = async () => {
      const { error } = await db
        .from('billing_customers')
        .update({ checkout_lock_until: null })
        .eq('user_id', user.id);
      if (error) throw error;
    };
    const subscriptions = stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });
    for await (const subscription of subscriptions) {
      if (!['canceled', 'incomplete_expired'].includes(subscription.status))
        throw new ApiError(
          409,
          'You already have a subscription. Use Manage billing in your account.',
        );
      if (plan === 'trial' && usedIntroOffer(subscription))
        throw new ApiError(
          409,
          `The introductory offer is available once per account. Choose the ${money(catalog.monthlyAmount)} monthly plan.`,
        );
    }
    const { data: current, error: currentError } = await db
      .from('billing_customers')
      .select('checkout_session_id')
      .eq('user_id', user.id)
      .single();
    if (currentError) throw currentError;
    if (current.checkout_session_id) {
      const session = await stripe.checkout.sessions.retrieve(current.checkout_session_id, {
        expand: ['line_items', 'subscription'],
      });
      if (session.status === 'open') {
        if (
          session.metadata?.folio_plan === plan &&
          session.metadata?.pricing_version === catalog.version &&
          session.line_items?.data.some((line) => line.price?.id === price) &&
          (plan !== 'trial' ||
            session.line_items?.data.some((line) => line.price?.id === catalog.trialPriceId)) &&
          session.url
        )
          return Response.json({ url: session.url });
        // Switching offers must not open checkout with the old price or trial settings.
        await stripe.checkout.sessions.expire(session.id);
      }
      if (session.status === 'complete') {
        const subscription = typeof session.subscription === 'object' ? session.subscription : null;
        if (!subscription || !['canceled', 'incomplete_expired'].includes(subscription.status))
          throw new ApiError(
            409,
            'Your purchase is being confirmed. Refresh your account shortly.',
          );
        // A completed checkout for a terminated plan must allow re-subscription.
      }
    }
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customerId,
        client_reference_id: user.id,
        ...checkoutOffer(plan, price, catalog.trialPriceId || undefined, catalog),
        payment_method_collection: 'always',
        success_url: `${siteUrl}/dashboard?view=billing&checkout=success`,
        cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
      },
      {
        idempotencyKey: `folio-checkout-${user.id}-${plan}-${catalog.version}-${current.checkout_session_id || 'initial'}`,
      },
    );
    const { error } = await db
      .from('billing_customers')
      .update({ checkout_session_id: session.id })
      .eq('user_id', user.id);
    if (error) throw error;
    return Response.json({ url: session.url });
  } catch (error) {
    return apiError(error);
  } finally {
    await unlock?.().catch(() => {});
  }
}

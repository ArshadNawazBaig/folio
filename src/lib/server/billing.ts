import 'server-only';
import Stripe from 'stripe';
import { adminDb, authReady } from './auth';
import { ApiError } from './http';
import { hasPaidAccess } from '../billing-policy';
import { subscriptionSnapshot } from '../subscription-snapshot';
import { validMonthlyPrice, validTrialPrice } from '../billing-offers';
import { DEFAULT_CATALOG, money, type PricingCatalog } from '../platform';
import { getPlatform, catalogFromRow } from './platform';
import type { ProPlan } from '../pro-types';
export function billingReady() {
  return authReady() && !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new ApiError(503, 'Checkout is not connected yet.');
  return new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 15_000 });
}
export async function catalogForPrice(priceId: string): Promise<PricingCatalog | null> {
  const { data, error } = await adminDb()
    .from('pricing_versions')
    .select('*')
    .eq('monthly_price_id', priceId)
    .maybeSingle();
  if (error) throw new ApiError(503, 'Subscription pricing could not be verified.');
  if (data) return catalogFromRow(data);
  if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID)
    return {
      ...DEFAULT_CATALOG,
      monthlyPriceId: priceId,
      trialPriceId: process.env.STRIPE_PRO_TRIAL_PRICE_ID || null,
    };
  return null;
}
export async function accessFor(userId: string) {
  const { data, error } = await adminDb()
    .from('billing_subscriptions')
    .select('status,paid_until,current_period_end,cancel_at_period_end,price_id')
    .eq('user_id', userId);
  if (error) throw new ApiError(503, 'Your subscription could not be verified. Please try again.');
  const active = data
    ?.filter((row) => hasPaidAccess(row))
    .sort((a, b) => Date.parse(b.paid_until) - Date.parse(a.paid_until))[0];
  const [grant, admin] = await Promise.all([
    adminDb()
      .from('access_grants')
      .select('until_at')
      .eq('user_id', userId)
      .gt('until_at', new Date().toISOString())
      .maybeSingle(),
    adminDb().from('super_admins').select('user_id').eq('user_id', userId).maybeSingle(),
  ]);
  if (grant.error || admin.error)
    throw new ApiError(503, 'Your account access could not be verified.');
  const catalog = active ? await catalogForPrice(active.price_id) : null;
  return {
    pro: !!active || !!grant.data,
    expiresAt: active?.paid_until || grant.data?.until_at || null,
    cancelAtPeriodEnd: active?.cancel_at_period_end || false,
    billingReady: billingReady(),
    trial: active?.status === 'trialing',
    courtesy: !active && !!grant.data,
    admin: !!admin.data,
    renewalLabel: catalog ? money(catalog.monthlyAmount) : undefined,
  };
}
export async function consumeProRequest(userId: string) {
  const { data, error } = await adminDb().rpc('consume_pro_request', { account_id: userId });
  if (error) throw new ApiError(503, 'Pro access could not be verified. Please try again.');
  if (data === 'not_subscribed')
    throw new ApiError(402, 'An active Folio Pro subscription is required.');
  if (data === 'suspended') throw new ApiError(403, 'This account is suspended. Contact support.');
  if (data !== 'allowed')
    throw new ApiError(429, 'You have reached the processing limit. Please try again later.');
}
export async function availablePlans(): Promise<ProPlan[]> {
  if (!billingReady()) return [];
  const { settings, catalog } = await getPlatform();
  if (!settings.purchasesEnabled || !catalog.monthlyPriceId) return [];
  const stripe = stripeClient();
  const monthly = await stripe.prices.retrieve(catalog.monthlyPriceId);
  if (!validMonthlyPrice(monthly, catalog)) return [];
  const plans: ProPlan[] = [
    {
      id: 'month',
      amount: catalog.monthlyAmount,
      currency: catalog.currency,
      label: money(catalog.monthlyAmount),
    },
  ];
  if (catalog.trialEnabled && catalog.trialPriceId) {
    const trial = await stripe.prices.retrieve(catalog.trialPriceId);
    if (validTrialPrice(trial, catalog))
      plans.unshift({
        id: 'trial',
        amount: catalog.trialAmount,
        currency: catalog.currency,
        label: money(catalog.trialAmount),
      });
  }
  return plans;
}
export async function syncSubscription(
  subscriptionId: string,
  eventId: string,
  eventCreated: number,
) {
  const stripe = stripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice'],
  });
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const db = adminDb();
  const { data: owner, error: ownerError } = await db
    .from('billing_customers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (ownerError) throw ownerError;
  if (!owner) return; // Events for other products/accounts are not Folio grants.
  let catalog: PricingCatalog | null = null;
  for (const item of subscription.items.data) {
    catalog = await catalogForPrice(item.price.id);
    if (catalog) break;
  }
  const allowed = catalog?.monthlyPriceId ? [catalog.monthlyPriceId] : [];
  const { error } = await db.rpc('record_billing_event', {
    event_id: eventId,
    event_created: eventCreated,
    account_id: owner.user_id,
    ...subscriptionSnapshot(
      subscription,
      allowed,
      catalog?.trialPriceId || undefined,
      catalog || DEFAULT_CATALOG,
    ),
  });
  if (error) throw error;
}

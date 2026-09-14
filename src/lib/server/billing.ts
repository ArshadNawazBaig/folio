import 'server-only';
import { adminDb, authReady } from './auth';
import { ApiError } from './http';
import { hasPaidAccess } from '../billing-policy';
import {
  lemonAccessSnapshot,
  type LemonSubscription,
  type LemonPayment,
  type LemonResource,
} from '../lemon-squeezy';
import {
  lemonConfigured,
  lemonConfig,
  lemonGet,
  lemonList,
  lemonRequest,
  validateLemonVariant,
} from './lemon-squeezy';
import { money, type PricingCatalog } from '../platform';
import { getPlatform } from './platform';
import type { ProPlan } from '../pro-types';
export function billingReady() {
  return authReady() && lemonConfigured();
}
export async function catalogForPrice(priceId: string): Promise<PricingCatalog | null> {
  if (!priceId.startsWith('lemon_')) return null;
  const { data, error } = await adminDb()
    .from('lemon_checkouts')
    .select('terms')
    .eq('id', priceId.slice(6))
    .maybeSingle();
  if (error) throw new ApiError(503, 'Subscription pricing could not be verified.');
  return data?.terms || null;
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
  if (!settings.purchasesEnabled) return [];
  const checks = await Promise.all([
    validateLemonVariant(catalog.monthlyPriceId, 'month', catalog),
    catalog.trialEnabled ? validateLemonVariant(catalog.trialPriceId, 'trial', catalog) : false,
  ]);
  return (['trial', 'month'] as const)
    .filter((plan) => checks[plan === 'month' ? 0 : 1])
    .map((id) => ({
      id,
      amount: id === 'trial' ? catalog.trialAmount : catalog.monthlyAmount,
      currency: catalog.currency,
      label: money(id === 'trial' ? catalog.trialAmount : catalog.monthlyAmount),
    }));
}
export async function syncSubscription(
  subscriptionId: string,
  eventId: string,
  eventCreated = Date.now(),
  token?: string,
) {
  const config = lemonConfig(),
    db = adminDb();
  const sub = await lemonGet<LemonSubscription>('subscriptions', subscriptionId);
  if (String(sub.store_id) !== config.storeId || sub.test_mode !== config.testMode) return;
  const bound = await db
    .from('lemon_checkouts')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .maybeSingle();
  if (bound.error) throw bound.error;
  let checkout = bound.data;
  if (!checkout && token && /^[0-9a-f-]{36}$/i.test(token)) {
    const found = await db.from('lemon_checkouts').select('*').eq('id', token).maybeSingle();
    if (found.error) throw found.error;
    checkout = found.data;
  }
  if (!checkout) {
    // Unrelated products are ignored; our subscription events retry until the
    // creation webhook has supplied the checkout binding.
    const { catalog } = await getPlatform();
    if ([catalog.monthlyPriceId, catalog.trialPriceId].includes(String(sub.variant_id)))
      throw new ApiError(503, 'Subscription ownership is awaiting confirmation.');
    return;
  }
  if (
    checkout.store_id !== config.storeId ||
    checkout.test_mode !== config.testMode ||
    checkout.variant_id !== String(sub.variant_id) ||
    (checkout.subscription_id && checkout.subscription_id !== subscriptionId) ||
    Date.parse(sub.created_at) < Date.parse(checkout.created_at) - 300000 ||
    (!checkout.subscription_id &&
      Date.parse(sub.created_at) > Date.parse(checkout.expires_at) + 300000)
  )
    throw new ApiError(400, 'The subscription does not match its checkout.');
  const [order, invoices] = await Promise.all([
    lemonGet<LemonPayment>('orders', sub.order_id),
    lemonList<LemonPayment>('subscription-invoices', { subscription_id: subscriptionId }),
  ]);
  const snapshot = lemonAccessSnapshot(
    subscriptionId,
    sub,
    order,
    invoices.data.map((i) => i.attributes),
    checkout.plan,
    checkout.terms,
    {
      storeId: checkout.store_id,
      variantId: checkout.variant_id,
      testMode: checkout.test_mode,
    },
  );
  const { error } = await db.rpc('record_lemon_subscription', {
    token: checkout.id,
    provider_subscription: subscriptionId,
    provider_customer: String(sub.customer_id),
    provider_order: String(sub.order_id),
    event_id: eventId,
    event_created: eventCreated,
    ...snapshot,
  });
  if (error) throw error;
}
export async function changeSubscription(
  id: string,
  operation: 'cancel_end' | 'cancel_now' | 'resume',
  eventId: string,
) {
  if (!/^lemon_[1-9]\d*$/.test(id)) throw new ApiError(400, 'Choose a Lemon Squeezy subscription.');
  const providerId = id.slice(6),
    db = adminDb();
  const owned = await db
    .from('billing_subscriptions')
    .select('user_id,access_revoked')
    .eq('stripe_subscription_id', id)
    .maybeSingle();
  if (owned.error) throw owned.error;
  if (!owned.data) throw new ApiError(404, 'This subscription is not a Folio subscription.');
  if (operation === 'resume' && owned.data.access_revoked)
    throw new ApiError(409, 'An ended subscription cannot be resumed.');
  const before = await lemonGet<LemonSubscription>('subscriptions', providerId);
  const config = lemonConfig();
  if (String(before.store_id) !== config.storeId || before.test_mode !== config.testMode)
    throw new ApiError(409, 'This subscription belongs to a different billing environment.');
  if (operation === 'resume') {
    await lemonRequest<{ data: LemonResource<LemonSubscription> }>(
      `/subscriptions/${providerId}`,
      'PATCH',
      {
        data: { type: 'subscriptions', id: providerId, attributes: { cancelled: false } },
      },
    );
  } else if (!before.cancelled && before.status !== 'expired') {
    await lemonRequest(`/subscriptions/${providerId}`, 'DELETE');
  }
  const confirmed = await lemonGet<LemonSubscription>('subscriptions', providerId);
  if (
    operation === 'resume'
      ? confirmed.cancelled || !['active', 'on_trial'].includes(confirmed.status)
      : !confirmed.cancelled && confirmed.status !== 'expired'
  )
    throw new ApiError(
      409,
      'The billing change was not confirmed. Manage this subscription in Lemon Squeezy.',
    );
  if (operation === 'cancel_now') {
    const revoked = await db
      .from('billing_subscriptions')
      .update({
        access_revoked: true,
        status: 'canceled',
        paid_until: null,
        cancel_at_period_end: true,
      })
      .eq('stripe_subscription_id', id);
    if (revoked.error) throw revoked.error;
  }
  await syncSubscription(providerId, eventId);
}

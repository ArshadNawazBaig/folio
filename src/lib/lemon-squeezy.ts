import type { PricingValues } from './platform';

export type LemonResource<T> = { type: string; id: string; attributes: T };
export type LemonPrice = {
  variant_id: number;
  category: string;
  scheme: string;
  unit_price: number;
  usage_aggregation: string | null;
  setup_fee_enabled: boolean;
  setup_fee: number | null;
  renewal_interval_unit: string | null;
  renewal_interval_quantity: number | null;
  trial_interval_unit: string | null;
  trial_interval_quantity: number | null;
};
export type LemonSubscription = {
  store_id: number;
  customer_id: number;
  order_id: number;
  variant_id: number;
  status: string;
  cancelled: boolean;
  pause: unknown;
  trial_ends_at: string | null;
  renews_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  test_mode: boolean;
  first_subscription_item: { quantity: number } | null;
  urls: { customer_portal: string };
};
export type LemonPayment = {
  store_id: number;
  customer_id: number;
  subscription_id?: number;
  status: string;
  refunded: boolean;
  refunded_amount: number;
  subtotal_usd: number;
  total_usd: number;
  discount_total_usd: number;
  setup_fee_usd?: number;
  billing_reason?: string;
  first_order_item?: { variant_id: number };
  created_at: string;
  updated_at: string;
  test_mode: boolean;
};

export function validLemonPrice(
  price: LemonPrice,
  plan: 'trial' | 'month',
  catalog: PricingValues,
) {
  return (
    price.category === 'subscription' &&
    price.scheme === 'standard' &&
    !price.usage_aggregation &&
    price.unit_price === catalog.monthlyAmount &&
    price.renewal_interval_unit === 'month' &&
    price.renewal_interval_quantity === 1 &&
    (plan === 'trial'
      ? catalog.trialEnabled &&
        price.setup_fee_enabled &&
        price.setup_fee === catalog.trialAmount &&
        price.trial_interval_unit === 'day' &&
        price.trial_interval_quantity === catalog.trialDays
      : !price.setup_fee_enabled && !price.trial_interval_quantity)
  );
}

// Hosted links only. Never accept credentials, lookalike domains, or a script URL.
export function isLemonUrl(value: string, kind: 'checkout' | 'portal') {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      /^[a-z0-9-]+\.lemonsqueezy\.com$/i.test(url.hostname) &&
      (kind === 'checkout'
        ? url.pathname.startsWith('/checkout/')
        : /^\/billing(?:\/|$)/.test(url.pathname))
    );
  } catch {
    return false;
  }
}

const time = (value: string | null | undefined) => (value ? Date.parse(value) || 0 : 0);
function nextMonth(start: number) {
  const date = new Date(start),
    day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.getTime();
}

// A provider status or success redirect alone never grants access. Both the
// purchase identity and a canonical paid order/invoice must match this checkout.
export function lemonAccessSnapshot(
  id: string,
  sub: LemonSubscription,
  order: LemonPayment,
  invoices: LemonPayment[],
  plan: 'trial' | 'month',
  catalog: PricingValues,
  expected: { storeId: string; variantId: string; testMode: boolean },
) {
  const owns = (p: LemonPayment) =>
    String(p.store_id) === expected.storeId &&
    p.customer_id === sub.customer_id &&
    p.test_mode === expected.testMode;
  const paid = (p: LemonPayment, amount: number) =>
    owns(p) &&
    p.status === 'paid' &&
    p.refunded === false &&
    p.refunded_amount === 0 &&
    p.discount_total_usd === 0 &&
    p.total_usd >= amount;
  const valid =
    String(sub.store_id) === expected.storeId &&
    sub.test_mode === expected.testMode &&
    String(sub.variant_id) === expected.variantId &&
    owns(order) &&
    String(order.first_order_item?.variant_id) === expected.variantId &&
    (!sub.first_subscription_item || sub.first_subscription_item.quantity === 1);
  const cycleEnd = time(sub.ends_at) || time(sub.renews_at);
  let paidUntil = 0;
  let monthlyPaid = false;
  const trialEnd = Math.min(
    time(sub.trial_ends_at),
    time(sub.created_at) + catalog.trialDays * 86400000,
  );
  if (
    valid &&
    plan === 'trial' &&
    paid(order, catalog.trialAmount) &&
    order.setup_fee_usd === catalog.trialAmount
  )
    paidUntil = trialEnd;
  const latest = invoices
    .filter(
      (p) =>
        owns(p) &&
        String(p.subscription_id) === id &&
        ['initial', 'renewal'].includes(p.billing_reason || ''),
    )
    .sort((a, b) => time(b.created_at) - time(a.created_at))[0];
  if (
    valid &&
    latest &&
    paid(latest, catalog.monthlyAmount) &&
    latest.subtotal_usd === catalog.monthlyAmount &&
    // Refunding the original order may precede the corresponding invoice update.
    (latest.billing_reason !== 'initial' ||
      paid(order, plan === 'trial' ? catalog.trialAmount : catalog.monthlyAmount)) &&
    (plan === 'month' || time(latest.created_at) >= trialEnd - 300000)
  ) {
    paidUntil = Math.max(paidUntil, nextMonth(time(latest.created_at)));
    monthlyPaid = true;
  } else if (
    valid &&
    plan === 'month' &&
    !latest &&
    paid(order, catalog.monthlyAmount) &&
    order.subtotal_usd === catalog.monthlyAmount &&
    !order.setup_fee_usd
  ) {
    paidUntil = nextMonth(time(order.created_at));
    monthlyPaid = true;
  }
  // Refunds/failures for the latest monthly payment cannot resurrect an older invoice.
  if (latest && (latest.refunded || latest.refunded_amount > 0 || latest.status !== 'paid'))
    paidUntil = Math.min(paidUntil, time(latest.created_at));
  if (!valid || sub.pause || !['active', 'on_trial', 'cancelled'].includes(sub.status))
    paidUntil = 0;
  paidUntil = Math.min(paidUntil, cycleEnd);
  const status =
    sub.status === 'expired'
      ? 'canceled'
      : sub.status === 'on_trial'
        ? 'trialing'
        : sub.status === 'cancelled'
          ? 'active'
          : sub.status;
  return {
    subscription_status: status,
    paid_until_value: paidUntil > 0 ? new Date(paidUntil).toISOString() : null,
    period_end_value: cycleEnd ? new Date(cycleEnd).toISOString() : null,
    cancel_value: sub.cancelled || sub.status === 'cancelled',
    monthly_paid_value: monthlyPaid && paidUntil > 0,
  };
}

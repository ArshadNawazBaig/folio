// Accept only canonical data retrieved from Stripe on the server.
import { PRO_PRICING } from './plans';
import { DEFAULT_CATALOG, type PricingCatalog } from './platform';
type Subscription = {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  metadata?: Record<string, string>;
  trial_start?: number | null;
  trial_end?: number | null;
  items: { data: { id: string; price: { id: string }; current_period_end: number }[] };
  latest_invoice:
    | string
    | null
    | {
        status: string | null;
        amount_paid: number;
        currency?: string;
        created?: number;
        billing_reason?: string | null;
        lines: {
          data: {
            amount: number;
            quantity?: number | null;
            pricing?: { price_details?: { price: string | { id: string } } } | null;
            period: { end: number };
            parent?: {
              subscription_item_details?: { subscription_item: string | null } | null;
            } | null;
          }[];
        };
      };
};

export function subscriptionSnapshot(
  subscription: Subscription,
  allowedPrices: readonly string[],
  trialPriceId?: string,
  catalog: PricingCatalog = DEFAULT_CATALOG,
) {
  const item =
    subscription.items.data.find((entry) => allowedPrices.includes(entry.price.id)) ||
    subscription.items.data[0];
  if (!item) throw new Error('The subscription has no items.');
  const invoice =
    typeof subscription.latest_invoice === 'object' ? subscription.latest_invoice : null;
  // Invoice.period_end can be the creation time on a first invoice. Use the
  // purchased subscription item's invoice line period, capped by its renewal.
  const coveredUntil = Math.max(
    0,
    ...(invoice?.lines.data
      .filter(
        (line) =>
          line.parent?.subscription_item_details?.subscription_item === item.id && line.amount > 0,
      )
      .map((line) => line.period.end) || []),
  );
  let paidUntil =
    allowedPrices.includes(item.price.id) && invoice?.status === 'paid' && invoice.amount_paid > 0
      ? Math.min(item.current_period_end, coveredUntil)
      : 0;
  if (subscription.status === 'trialing') {
    // Stripe's recurring item is $0 during this period. The separate $1 invoice
    // line must be paid before the introductory week grants any Pro access.
    const start = subscription.trial_start;
    const end = subscription.trial_end;
    const paidTrial =
      !!trialPriceId &&
      allowedPrices.includes(item.price.id) &&
      subscription.metadata?.folio_offer === PRO_PRICING.offerVersion &&
      typeof start === 'number' &&
      typeof end === 'number' &&
      end > start &&
      invoice?.status === 'paid' &&
      invoice.currency === catalog.currency &&
      invoice.billing_reason === 'subscription_create' &&
      typeof invoice.created === 'number' &&
      Math.abs(invoice.created - start) <= 300 &&
      invoice.amount_paid >= catalog.trialAmount &&
      invoice.lines.data.some((line) => {
        const price = line.pricing?.price_details?.price;
        return (
          (typeof price === 'string' ? price : price?.id) === trialPriceId &&
          line.amount === catalog.trialAmount &&
          line.quantity === 1
        );
      });
    paidUntil = paidTrial
      ? Math.min(end!, start! + catalog.trialDays * 86400, item.current_period_end)
      : 0;
  }
  return {
    subscription_id: subscription.id,
    subscription_status: subscription.status,
    allowed_price_id: item.price.id,
    paid_until_value: paidUntil ? new Date(paidUntil * 1000).toISOString() : null,
    period_end_value: new Date(item.current_period_end * 1000).toISOString(),
    cancel_value: subscription.cancel_at_period_end,
  };
}

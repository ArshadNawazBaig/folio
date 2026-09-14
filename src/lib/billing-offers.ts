import type Stripe from 'stripe';
import { PRO_PRICING, type PlanChoice } from './plans';
import { DEFAULT_CATALOG, offerTerms, type PricingCatalog } from './platform';

type Price = Pick<
  Stripe.Price,
  | 'active'
  | 'currency'
  | 'unit_amount'
  | 'type'
  | 'recurring'
  | 'billing_scheme'
  | 'transform_quantity'
>;
export function validMonthlyPrice(price: Price, catalog: PricingCatalog = DEFAULT_CATALOG) {
  return (
    price.active &&
    price.currency === catalog.currency &&
    price.unit_amount === catalog.monthlyAmount &&
    price.type === 'recurring' &&
    price.recurring?.interval === 'month' &&
    price.recurring.interval_count === 1 &&
    price.recurring.usage_type === 'licensed' &&
    price.billing_scheme === 'per_unit' &&
    !price.transform_quantity
  );
}
export function validTrialPrice(price: Price, catalog: PricingCatalog = DEFAULT_CATALOG) {
  return (
    price.active &&
    price.currency === catalog.currency &&
    price.unit_amount === catalog.trialAmount &&
    price.type === 'one_time' &&
    !price.recurring &&
    price.billing_scheme === 'per_unit' &&
    !price.transform_quantity
  );
}
export function usedIntroOffer(
  subscription: Pick<Stripe.Subscription, 'metadata' | 'trial_start'>,
) {
  return (
    subscription.metadata.folio_offer === PRO_PRICING.offerVersion &&
    subscription.trial_start !== null
  );
}
// The browser supplies only a choice; all prices, duration, and renewal terms come from the server.
export function checkoutOffer(
  plan: PlanChoice,
  monthlyPrice: string,
  trialPrice?: string,
  catalog: PricingCatalog = DEFAULT_CATALOG,
) {
  if (plan === 'trial' && !trialPrice) throw new Error('The introductory price is not configured.');
  const metadata = {
    folio_plan: plan,
    folio_offer: plan === 'trial' ? PRO_PRICING.offerVersion : 'monthly_v1',
    pricing_version: catalog.version,
  };
  return {
    line_items: [
      { price: monthlyPrice, quantity: 1 },
      ...(plan === 'trial' ? [{ price: trialPrice!, quantity: 1 }] : []),
    ],
    subscription_data: {
      metadata,
      ...(plan === 'trial'
        ? {
            trial_period_days: catalog.trialDays,
            trial_settings: { end_behavior: { missing_payment_method: 'cancel' as const } },
          }
        : {}),
    },
    metadata,
    custom_text: { submit: { message: offerTerms(catalog, plan) } },
  } satisfies Pick<
    Stripe.Checkout.SessionCreateParams,
    'line_items' | 'subscription_data' | 'metadata' | 'custom_text'
  >;
}

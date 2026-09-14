import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkoutOffer,
  usedIntroOffer,
  validMonthlyPrice,
  validTrialPrice,
} from '../src/lib/billing-offers';
import { PRO_PRICING } from '../src/lib/plans';
import { subscriptionSnapshot } from '../src/lib/subscription-snapshot';
import { hasPaidAccess } from '../src/lib/billing-policy';

test('only the agreed USD prices and billing intervals can open checkout', () => {
  const monthly = {
    active: true,
    currency: 'usd',
    unit_amount: 2500,
    type: 'recurring',
    billing_scheme: 'per_unit',
    transform_quantity: null,
    recurring: {
      interval: 'month',
      interval_count: 1,
      usage_type: 'licensed',
      meter: null,
      trial_period_days: null,
    },
  } satisfies Parameters<typeof validMonthlyPrice>[0];
  const trial = {
    ...monthly,
    unit_amount: 100,
    type: 'one_time',
    recurring: null,
  } satisfies Parameters<typeof validTrialPrice>[0];
  assert.equal(validMonthlyPrice(monthly), true);
  assert.equal(validTrialPrice(trial), true);
  assert.equal(validMonthlyPrice({ ...monthly, unit_amount: 2400 }), false);
  assert.equal(validMonthlyPrice({ ...monthly, currency: 'cad' }), false);
  assert.equal(
    validMonthlyPrice({ ...monthly, recurring: { ...monthly.recurring, interval: 'year' } }),
    false,
  );
  assert.equal(
    validMonthlyPrice({ ...monthly, recurring: { ...monthly.recurring, usage_type: 'metered' } }),
    false,
  );
  assert.equal(validTrialPrice({ ...trial, unit_amount: 0 }), false);
  assert.equal(validTrialPrice({ ...trial, unit_amount: 1000 }), false);
  assert.equal(validTrialPrice({ ...trial, active: false }), false);
  assert.equal(validTrialPrice(monthly), false);
});

test('trial checkout charges the $1 item once and defers the $25 item for exactly seven days', () => {
  const trial = checkoutOffer('trial', 'price_monthly_25', 'price_intro_1');
  assert.deepEqual(trial.line_items, [
    { price: 'price_monthly_25', quantity: 1 },
    { price: 'price_intro_1', quantity: 1 },
  ]);
  assert.equal(trial.subscription_data?.trial_period_days, 7);
  assert.equal(
    trial.subscription_data?.trial_settings?.end_behavior.missing_payment_method,
    'cancel',
  );
  assert.match(
    trial.custom_text!.submit!.message,
    /\$1 USD today for 7 days, then \$25 USD per month automatically/,
  );
  assert.equal(trial.subscription_data?.metadata?.folio_offer, PRO_PRICING.offerVersion);
  const monthly = checkoutOffer('month', 'price_monthly_25', 'price_intro_1');
  assert.deepEqual(monthly.line_items, [{ price: 'price_monthly_25', quantity: 1 }]);
  assert.equal(monthly.subscription_data?.trial_period_days, undefined);
  assert.match(monthly.custom_text!.submit!.message, /\$25 USD per month, starting today/);
  assert.throws(() => checkoutOffer('trial', 'price_monthly_25'), /not configured/);
  assert.equal(
    usedIntroOffer({ metadata: { folio_offer: PRO_PRICING.offerVersion }, trial_start: 100 }),
    true,
  );
  assert.equal(
    usedIntroOffer({ metadata: { folio_offer: 'monthly_v1' }, trial_start: null }),
    false,
  );
});

function trialSubscription() {
  const start = Math.floor(Date.now() / 1000);
  const end = start + 7 * 86400;
  return {
    id: 'sub_intro',
    status: 'trialing',
    cancel_at_period_end: false,
    trial_start: start,
    trial_end: end,
    metadata: { folio_offer: String(PRO_PRICING.offerVersion) },
    items: {
      data: [{ id: 'si_month', price: { id: 'price_monthly_25' }, current_period_end: end }],
    },
    latest_invoice: {
      status: 'paid',
      currency: 'usd',
      amount_paid: 100,
      created: start,
      billing_reason: 'subscription_create',
      lines: {
        data: [
          {
            amount: 0,
            quantity: 1,
            period: { end },
            pricing: { price_details: { price: 'price_monthly_25' } },
            parent: { subscription_item_details: { subscription_item: 'si_month' } },
          },
          // One-time charge's line period ends immediately, so it cannot set trial expiry.
          {
            amount: 100,
            quantity: 1,
            period: { end: start },
            pricing: { price_details: { price: 'price_intro_1' } },
          },
        ],
      },
    },
  };
}
const snapshot = (subscription: ReturnType<typeof trialSubscription>) =>
  subscriptionSnapshot(subscription, ['price_monthly_25'], 'price_intro_1');
const access = (subscription: ReturnType<typeof trialSubscription>, now = Date.now()) => {
  const result = snapshot(subscription);
  return hasPaidAccess(
    {
      status: result.subscription_status,
      paid_until: result.paid_until_value,
      current_period_end: result.period_end_value,
    },
    now,
  );
};

test('a verified $1 payment grants only seven days, survives scheduled cancellation, and cannot extend itself', () => {
  const subscription = trialSubscription();
  assert.equal(access(subscription), true);
  assert.equal(
    snapshot(subscription).paid_until_value,
    new Date(subscription.trial_end * 1000).toISOString(),
  );
  assert.equal(access(subscription, subscription.trial_end * 1000), false);
  subscription.cancel_at_period_end = true;
  assert.equal(access(subscription), true);
  subscription.trial_end += 86400 * 30;
  subscription.items.data[0].current_period_end = subscription.trial_end;
  assert.equal(
    snapshot(subscription).paid_until_value,
    new Date((subscription.trial_start + 86400 * 7) * 1000).toISOString(),
  );
  subscription.status = 'canceled';
  assert.equal(access(subscription), false);
});

test('unpaid, unrelated, zero-charge and forged introductory state never grants access', () => {
  const mutations: Array<(s: ReturnType<typeof trialSubscription>) => void> = [
    (s) => {
      s.latest_invoice.status = 'open';
    },
    (s) => {
      s.latest_invoice.amount_paid = 0;
    },
    (s) => {
      s.latest_invoice.currency = 'cad';
    },
    (s) => {
      s.latest_invoice.lines.data[1].amount = 0;
    },
    (s) => {
      s.latest_invoice.lines.data[1].pricing.price_details.price = 'price_unrelated';
    },
    (s) => {
      s.latest_invoice.billing_reason = 'manual';
    },
    (s) => {
      s.latest_invoice.created -= 86400;
    },
    (s) => {
      s.latest_invoice.lines.data[1].quantity = 2;
    },
    (s) => {
      s.items.data[0].price.id = 'price_other_plan';
    },
    (s) => {
      s.metadata = { folio_offer: '' };
    },
  ];
  for (const mutate of mutations) {
    const subscription = trialSubscription();
    mutate(subscription);
    assert.equal(access(subscription), false);
  }
  const subscription = trialSubscription();
  assert.equal(subscriptionSnapshot(subscription, ['price_monthly_25']).paid_until_value, null);
});

test('monthly renewal requires its own paid invoice and never reuses the introductory payment', () => {
  const subscription = trialSubscription();
  subscription.status = 'active';
  assert.equal(access(subscription), false);
  const nextMonthEnd = subscription.trial_end + 30 * 86400;
  subscription.items.data[0].current_period_end = nextMonthEnd;
  subscription.latest_invoice.billing_reason = 'subscription_cycle';
  subscription.latest_invoice.lines.data = [
    {
      amount: 2500,
      quantity: 1,
      period: { end: nextMonthEnd },
      pricing: { price_details: { price: 'price_monthly_25' } },
      parent: { subscription_item_details: { subscription_item: 'si_month' } },
    },
  ];
  subscription.latest_invoice.amount_paid = 2500;
  assert.equal(access(subscription), true);
  assert.equal(
    snapshot(subscription).paid_until_value,
    new Date(nextMonthEnd * 1000).toISOString(),
  );
  subscription.status = 'past_due';
  subscription.latest_invoice.status = 'open';
  assert.equal(access(subscription), false);
});

test('versioned offers use their own amounts and duration while old trials retain their purchased terms', async () => {
  const { DEFAULT_CATALOG } = await import('../src/lib/platform');
  const updated = {
    ...DEFAULT_CATALOG,
    version: 'next-version',
    monthlyAmount: 3000,
    trialAmount: 200,
    trialDays: 10,
  };
  const offer = checkoutOffer('trial', 'price_new', 'price_intro_new', updated);
  assert.equal(offer.subscription_data.trial_period_days, 10);
  assert.equal(offer.metadata.pricing_version, 'next-version');
  assert.match(offer.custom_text.submit.message, /\$2 USD today for 10 days, then \$30/);
  const old = trialSubscription();
  assert.notEqual(
    subscriptionSnapshot(old, ['price_monthly_25'], 'price_intro_1', DEFAULT_CATALOG)
      .paid_until_value,
    null,
  );
  assert.equal(
    subscriptionSnapshot(old, ['price_monthly_25'], 'price_intro_1', updated).paid_until_value,
    null,
  );
  old.latest_invoice.amount_paid = 200;
  old.latest_invoice.lines.data[1].amount = 200;
  old.trial_end = old.trial_start + 10 * 86400;
  old.items.data[0].current_period_end = old.trial_end;
  assert.equal(
    subscriptionSnapshot(old, ['price_monthly_25'], 'price_intro_1', updated).paid_until_value,
    new Date(old.trial_end * 1000).toISOString(),
  );
});

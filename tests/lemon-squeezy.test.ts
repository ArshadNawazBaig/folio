import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CATALOG } from '../src/lib/platform';
import { hasPaidAccess } from '../src/lib/billing-policy';
import {
  isLemonUrl,
  validLemonPrice,
  lemonAccessSnapshot,
  type LemonPayment,
  type LemonSubscription,
} from '../src/lib/lemon-squeezy';
const now = Date.UTC(2026, 0, 31, 12),
  iso = (n: number) => new Date(n).toISOString();
const expected = { storeId: '1', variantId: '2', testMode: true };
const subscription = (): LemonSubscription => ({
  store_id: 1,
  customer_id: 5,
  order_id: 6,
  variant_id: 2,
  status: 'on_trial',
  cancelled: false,
  pause: null,
  trial_ends_at: iso(now + 7 * 86400000),
  renews_at: iso(now + 7 * 86400000),
  ends_at: null,
  created_at: iso(now),
  updated_at: iso(now),
  test_mode: true,
  first_subscription_item: null,
  urls: { customer_portal: 'https://folio.lemonsqueezy.com/billing' },
});
const order = (): LemonPayment => ({
  store_id: 1,
  customer_id: 5,
  status: 'paid',
  refunded: false,
  refunded_amount: 0,
  subtotal_usd: 100,
  setup_fee_usd: 100,
  total_usd: 100,
  discount_total_usd: 0,
  first_order_item: { variant_id: 2 },
  created_at: iso(now),
  updated_at: iso(now),
  test_mode: true,
});
function snapshot(
  sub = subscription(),
  payment = order(),
  invoices: LemonPayment[] = [],
  plan: 'trial' | 'month' = 'trial',
) {
  return lemonAccessSnapshot('9', sub, payment, invoices, plan, DEFAULT_CATALOG, expected);
}
const access = (result: ReturnType<typeof snapshot>, at = now) =>
  hasPaidAccess(
    {
      status: result.subscription_status,
      paid_until: result.paid_until_value,
      current_period_end: result.period_end_value,
    },
    at,
  );

test('only the configured recurring price with paid setup fee and exact trial is eligible', () => {
  const price = {
    variant_id: 2,
    category: 'subscription',
    scheme: 'standard',
    unit_price: 2500,
    usage_aggregation: null,
    setup_fee_enabled: true,
    setup_fee: 100,
    renewal_interval_unit: 'month',
    renewal_interval_quantity: 1,
    trial_interval_unit: 'day',
    trial_interval_quantity: 7,
  };
  assert.equal(validLemonPrice(price, 'trial', DEFAULT_CATALOG), true);
  for (const mutation of [
    { unit_price: 100 },
    { setup_fee: 0 },
    { trial_interval_quantity: 30 },
    { scheme: 'volume' },
    { renewal_interval_unit: 'year' },
  ])
    assert.equal(validLemonPrice({ ...price, ...mutation }, 'trial', DEFAULT_CATALOG), false);
  assert.equal(validLemonPrice(price, 'month', DEFAULT_CATALOG), false);
  assert.equal(
    validLemonPrice(
      { ...price, setup_fee_enabled: false, setup_fee: null, trial_interval_quantity: null },
      'month',
      DEFAULT_CATALOG,
    ),
    true,
  );
});
test('paid introductory access is capped at seven days, including scheduled cancellation', () => {
  assert.equal(access(snapshot()), true);
  assert.equal(snapshot().monthly_paid_value, false);
  assert.equal(access(snapshot(), now + 7 * 86400000), false);
  const sub = subscription();
  sub.status = 'cancelled';
  sub.cancelled = true;
  assert.equal(access(snapshot(sub)), true);
  assert.equal(
    snapshot(sub).monthly_paid_value,
    false,
    'Cancelling a trial does not unlock unlimited storage',
  );
  sub.trial_ends_at = iso(now + 30 * 86400000);
  sub.renews_at = sub.trial_ends_at;
  assert.equal(snapshot(sub).paid_until_value, iso(now + 7 * 86400000));
});
test('unpaid, refunded, discounted, unrelated and wrong-mode orders never unlock the introductory offer', () => {
  for (const mutation of [
    { status: 'pending' },
    { refunded: true },
    { refunded_amount: 1 },
    { total_usd: 0 },
    { discount_total_usd: 1 },
    { setup_fee_usd: 0 },
    { customer_id: 99 },
    { store_id: 99 },
    { test_mode: false },
    { first_order_item: { variant_id: 99 } },
  ])
    assert.equal(
      access(snapshot(subscription(), { ...order(), ...mutation })),
      false,
      JSON.stringify(mutation),
    );
  for (const mutation of [
    { store_id: 99 },
    { variant_id: 99 },
    { test_mode: false },
    { first_subscription_item: { quantity: 2 } },
    { pause: {} },
  ])
    assert.equal(access(snapshot({ ...subscription(), ...mutation })), false);
});
test('renewals require a new paid monthly invoice, not the $1 initial payment', () => {
  const sub = subscription(),
    start = now + 7 * 86400000;
  sub.status = 'active';
  sub.renews_at = iso(start + 28 * 86400000);
  assert.equal(access(snapshot(sub), start), false);
  assert.equal(
    snapshot(sub).monthly_paid_value,
    false,
    'Active status without a monthly payment is still a trial',
  );
  const invoice = {
    ...order(),
    subscription_id: 9,
    billing_reason: 'renewal',
    subtotal_usd: 2500,
    total_usd: 2500,
    created_at: iso(start),
  };
  assert.equal(access(snapshot(sub, order(), [invoice]), start), true);
  assert.equal(snapshot(sub, order(), [invoice]).monthly_paid_value, true);
  assert.equal(
    snapshot({ ...sub, status: 'cancelled', cancelled: true }, order(), [invoice])
      .monthly_paid_value,
    true,
  );
  for (const mutation of [
    { status: 'pending' },
    { refunded: true },
    { subscription_id: 99 },
    { subtotal_usd: 100 },
    { billing_reason: 'updated' },
  ]) {
    assert.equal(access(snapshot(sub, order(), [{ ...invoice, ...mutation }]), start), false);
    assert.equal(snapshot(sub, order(), [{ ...invoice, ...mutation }]).monthly_paid_value, false);
  }
  for (const status of ['past_due', 'unpaid', 'paused', 'expired'])
    assert.equal(access(snapshot({ ...sub, status }, order(), [invoice]), start), false);
  const later = { ...invoice, created_at: iso(start + 28 * 86400000), refunded: true };
  assert.equal(access(snapshot(sub, order(), [invoice, later]), start + 28 * 86400000), false);
});
test('monthly initial payments cover a calendar month and cannot extend themselves through a retry date', () => {
  const sub = {
    ...subscription(),
    status: 'active',
    trial_ends_at: null,
    renews_at: iso(now + 40 * 86400000),
  };
  const payment = { ...order(), setup_fee_usd: 0, subtotal_usd: 2500, total_usd: 2500 };
  assert.equal(snapshot(sub, payment, [], 'month').paid_until_value, '2026-02-28T12:00:00.000Z');
  assert.equal(access(snapshot(sub, payment, [], 'month')), true);
  assert.equal(snapshot(sub, payment, [], 'month').monthly_paid_value, true);
  const initialInvoice = { ...payment, subscription_id: 9, billing_reason: 'initial' };
  assert.equal(
    access(snapshot(sub, { ...payment, refunded: true }, [initialInvoice], 'month')),
    false,
  );
});
test('hosted payment links reject credentials, lookalikes, custom schemes and wrong destinations', () => {
  assert.equal(
    isLemonUrl('https://folio.lemonsqueezy.com/checkout/custom/abc?signature=test', 'checkout'),
    true,
  );
  assert.equal(isLemonUrl('https://folio.lemonsqueezy.com/billing?signature=test', 'portal'), true);
  for (const url of [
    'javascript:alert(1)',
    'https://lemonsqueezy.com.evil.test/checkout/a',
    'https://evil.test/checkout/a',
    'https://user@folio.lemonsqueezy.com/checkout/a',
    'http://folio.lemonsqueezy.com/checkout/a',
    'https://folio.lemonsqueezy.com:444/checkout/a',
    'https://folio.lemonsqueezy.com/billing',
  ])
    assert.equal(isLemonUrl(url, 'checkout'), false);
});

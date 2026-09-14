import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { hasPaidAccess } from '../src/lib/billing-policy';
import { subscriptionSnapshot } from '../src/lib/subscription-snapshot';
const user = '00000000-0000-4000-8000-000000000001';
test('paid coverage comes from the purchased invoice line and fails closed for unpaid or unrelated invoices', () => {
  const end = Math.floor(Date.now() / 1000) + 86400;
  const subscription = {
    id: 'sub_folio',
    status: 'active',
    cancel_at_period_end: false,
    items: { data: [{ id: 'si_pro', price: { id: 'price_pro' }, current_period_end: end }] },
    latest_invoice: {
      status: 'paid',
      amount_paid: 1200,
      // First invoices can have a top-level period ending at creation.
      period_end: end - 86400,
      lines: {
        data: [
          {
            amount: 1200,
            period: { end },
            parent: { subscription_item_details: { subscription_item: 'si_pro' } },
          },
          {
            amount: 2000,
            period: { end: end + 100000 },
            parent: { subscription_item_details: { subscription_item: 'si_other' } },
          },
        ],
      },
    },
  };
  const get = () => subscriptionSnapshot(subscription, ['price_pro']);
  assert.equal(get().paid_until_value, new Date(end * 1000).toISOString());
  subscription.cancel_at_period_end = true;
  assert.equal(get().cancel_value, true);
  assert.equal(get().paid_until_value, new Date(end * 1000).toISOString());
  subscription.latest_invoice.lines.data[0].period.end = end + 1000;
  assert.equal(get().paid_until_value, new Date(end * 1000).toISOString());
  assert.equal(subscriptionSnapshot(subscription, ['price_other']).paid_until_value, null);
  subscription.latest_invoice.status = 'open';
  assert.equal(get().paid_until_value, null);
  subscription.latest_invoice.status = 'paid';
  subscription.latest_invoice.amount_paid = 0;
  assert.equal(get().paid_until_value, null);
  subscription.latest_invoice.amount_paid = 1200;
  subscription.latest_invoice.lines.data[0].amount = -1200;
  assert.equal(get().paid_until_value, null);
  assert.equal(
    subscriptionSnapshot({ ...subscription, latest_invoice: 'in_unexpanded' }, ['price_pro'])
      .paid_until_value,
    null,
  );
});
test('subscription access requires paid active or trial status and both unexpired paid boundaries', () => {
  const now = Date.now(),
    future = new Date(now + 86400000).toISOString(),
    past = new Date(now - 1000).toISOString();
  const good = { status: 'active', paid_until: future, current_period_end: future };
  assert.equal(hasPaidAccess(good, now), true);
  assert.equal(hasPaidAccess({ ...good, status: 'trialing' }, now), true);
  assert.equal(hasPaidAccess({ ...good, status: 'trialing', paid_until: null }, now), false);
  for (const status of [
    'past_due',
    'unpaid',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'paused',
  ])
    assert.equal(hasPaidAccess({ ...good, status }, now), false);
  assert.equal(hasPaidAccess({ ...good, paid_until: past }, now), false);
  assert.equal(hasPaidAccess({ ...good, current_period_end: past }, now), false);
  assert.equal(hasPaidAccess({ ...good, paid_until: null }, now), false);
});
test('database enforces payment state, idempotency, event ordering, quotas, and role boundaries', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      'create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key);',
    );
    await db.exec(
      await readFile(new URL('../supabase/migrations/001_billing.sql', import.meta.url), 'utf8'),
    );
    await db.exec(
      await readFile(new URL('../supabase/migrations/002_paid_intro.sql', import.meta.url), 'utf8'),
    );
    await db.query('insert into auth.users values ($1)', [user]);
    await db.exec('set role authenticated');
    await assert.rejects(
      db.query('select public.consume_pro_request($1)', [user]),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "insert into public.billing_subscriptions(stripe_subscription_id,user_id,price_id,status) values ('sub_fake',$1,'price_fake','active')",
        [user],
      ),
      /permission denied/,
    );
    await db.exec('reset role; set role service_role');
    const consume = async () =>
      (
        await db.query<{ result: string }>('select public.consume_pro_request($1) as result', [
          user,
        ])
      ).rows[0].result;
    assert.equal(await consume(), 'not_subscribed');
    const future = new Date(Date.now() + 86400000).toISOString();
    const event = async (
      id: string,
      created: number,
      status: string,
      paid: string | null = future,
    ) =>
      db.query('select public.record_billing_event($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
        id,
        created,
        user,
        'sub_folio',
        status,
        'price_pro',
        paid,
        future,
        false,
      ]);
    await event('evt_trial_unpaid', 16, 'trialing', null);
    assert.equal(await consume(), 'not_subscribed');
    await event('evt_trial_paid', 17, 'trialing');
    assert.equal(await consume(), 'allowed');
    await event('evt_trial_expired', 18, 'trialing', new Date(Date.now() - 1000).toISOString());
    assert.equal(await consume(), 'not_subscribed');
    await event('evt_paid', 20, 'active');
    assert.equal(await consume(), 'allowed');
    await event('evt_old', 10, 'past_due', null);
    assert.equal(await consume(), 'allowed');
    await event('evt_paid', 25, 'past_due', null);
    assert.equal(await consume(), 'allowed');
    await db.query('update pro_usage set minute_count=20 where user_id=$1', [user]);
    assert.equal(await consume(), 'limited');
    await db.query('update pro_usage set minute_count=0,count=500 where user_id=$1', [user]);
    assert.equal(await consume(), 'limited');
    await db.query('update pro_usage set count=0 where user_id=$1', [user]);
    await event('evt_failed', 30, 'past_due', null);
    assert.equal(await consume(), 'not_subscribed');
    await event('evt_recovered', 40, 'active');
    assert.equal(await consume(), 'allowed');
    await event('evt_cancelled', 50, 'canceled');
    await event('evt_late_active', 60, 'active');
    assert.equal(await consume(), 'not_subscribed');
    await db.query('insert into billing_customers(user_id,stripe_customer_id) values ($1,$2)', [
      user,
      'cus_folio',
    ]);
    assert.equal(
      (await db.query<{ claimed: boolean }>('select claim_checkout($1) as claimed', [user])).rows[0]
        .claimed,
      true,
    );
    assert.equal(
      (await db.query<{ claimed: boolean }>('select claim_checkout($1) as claimed', [user])).rows[0]
        .claimed,
      false,
    );
  } finally {
    await db.close();
  }
});

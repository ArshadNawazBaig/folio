import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { DEFAULT_CATALOG, DEFAULT_SETTINGS } from '../src/lib/platform';
import { adminAction } from '../src/lib/admin-actions';
const admin = '00000000-0000-4000-8000-000000000001';
const customer = '00000000-0000-4000-8000-000000000002';
const other = '00000000-0000-4000-8000-000000000003';
async function setup() {
  const db = new PGlite();
  await db.exec(
    'create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),last_sign_in_at timestamptz);',
  );
  for (const name of ['001_billing.sql', '002_paid_intro.sql', '003_platform_admin.sql'])
    await db.exec(
      await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'),
    );
  await db.query(
    "insert into auth.users(id,email) values ($1,'admin@example.test'),($2,'customer@example.test'),($3,'other@example.test')",
    [admin, customer, other],
  );
  await db.query('insert into super_admins(user_id) values ($1)', [admin]);
  return db;
}
test('admin boundaries prevent role escalation, private reads, and unauthorized mutations', async () => {
  const db = await setup();
  try {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      for (const table of [
        'super_admins',
        'platform_settings',
        'pricing_versions',
        'admin_audit',
        'support_tickets',
        'support_messages',
        'access_grants',
        'account_controls',
      ])
        await assert.rejects(db.query(`select * from ${table}`), /permission denied/);
      await assert.rejects(
        db.query('insert into super_admins(user_id) values ($1)', [other]),
        /permission denied/,
      );
      await assert.rejects(
        db.query('select admin_save_settings($1,$2)', [admin, DEFAULT_SETTINGS]),
        /permission denied/,
      );
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    await assert.rejects(db.query('select admin_overview($1)', [other]), /admin_required/);
    await assert.rejects(db.query('select admin_users($1,$2,1)', [other, '']), /admin_required/);
    await assert.rejects(
      db.query('select admin_save_settings($1,$2)', [other, DEFAULT_SETTINGS]),
      /admin_required/,
    );
    await assert.rejects(
      db.query("select admin_user_action($1,$2,'grant','Fake grant',30)", [other, customer]),
      /admin_required/,
    );
    await assert.rejects(
      db.query("select admin_user_action($1,$2,'suspend','Lock out admin',30)", [admin, admin]),
      /protected_admin/,
    );
    const overview = (
      await db.query<{ value: { users: number } }>('select admin_overview($1) as value', [admin])
    ).rows[0].value;
    assert.equal(overview.users, 3);
    const search = (
      await db.query<{ value: { total: number; rows: { email: string }[] } }>(
        'select admin_users($1,$2,1) as value',
        [admin, 'customer@'],
      )
    ).rows[0].value;
    assert.equal(search.total, 1);
    assert.equal(search.rows[0].email, 'customer@example.test');
    assert.equal(
      (
        await db.query<{ value: { total: number } }>('select admin_users($1,$2,1) as value', [
          admin,
          '%',
        ])
      ).rows[0].value.total,
      0,
    );
  } finally {
    await db.close();
  }
});
test('courtesy access expires, respects suspension and quotas, and leaves an audit record', async () => {
  const db = await setup();
  try {
    await db.exec('set role service_role');
    const consume = async () =>
      (await db.query<{ value: string }>('select consume_pro_request($1) as value', [customer]))
        .rows[0].value;
    assert.equal(await consume(), 'not_subscribed');
    await db.query("select admin_user_action($1,$2,'grant','Customer goodwill',2)", [
      admin,
      customer,
    ]);
    assert.equal(await consume(), 'allowed');
    await db.query('update pro_usage set minute_count=20 where user_id=$1', [customer]);
    assert.equal(await consume(), 'limited');
    await db.query('update pro_usage set minute_count=0 where user_id=$1', [customer]);
    await db.query("select admin_user_action($1,$2,'suspend','Investigating account',30)", [
      admin,
      customer,
    ]);
    assert.equal(await consume(), 'suspended');
    await db.query("select admin_user_action($1,$2,'restore','Account reviewed',30)", [
      admin,
      customer,
    ]);
    assert.equal(await consume(), 'allowed');
    await db.query("update access_grants set until_at=now()-interval '1 second' where user_id=$1", [
      customer,
    ]);
    assert.equal(await consume(), 'not_subscribed');
    await db.query("select admin_user_action($1,$2,'revoke_grant','Grant ended',30)", [
      admin,
      customer,
    ]);
    assert.equal(
      (await db.query<{ n: number }>('select count(*)::int as n from admin_audit')).rows[0].n,
      4,
    );
    await assert.rejects(
      db.query("select admin_user_action($1,$2,'grant','Out of bounds',366)", [admin, customer]),
      /invalid_duration/,
    );
  } finally {
    await db.close();
  }
});
test('pricing publishes atomically, rejects stale versions, and retains existing subscriptions', async () => {
  const db = await setup();
  try {
    await db.exec('set role service_role');
    await db.query(
      "insert into billing_subscriptions(stripe_subscription_id,user_id,price_id,status) values ('sub_original',$1,'price_original','active')",
      [customer],
    );
    const pricing = {
      ...DEFAULT_CATALOG,
      monthlyAmount: 3000,
      trialAmount: 200,
      trialDays: 10,
      monthlyPriceId: 'price_new',
      trialPriceId: 'price_intro_new',
    };
    await db.query('select admin_publish_pricing($1,$2,$3,$4)', [
      admin,
      'initial',
      'version-two',
      pricing,
    ]);
    await assert.rejects(
      db.query('select admin_publish_pricing($1,$2,$3,$4)', [
        admin,
        'initial',
        'version-three',
        pricing,
      ]),
      /pricing_changed/,
    );
    assert.equal(
      (await db.query<{ pricing_version: string }>('select pricing_version from platform_settings'))
        .rows[0].pricing_version,
      'version-two',
    );
    assert.equal(
      (await db.query<{ n: number }>('select count(*)::int as n from pricing_versions')).rows[0].n,
      2,
    );
    assert.equal(
      (await db.query<{ price_id: string }>('select price_id from billing_subscriptions')).rows[0]
        .price_id,
      'price_original',
    );
    await db.query('select admin_save_settings($1,$2)', [
      admin,
      {
        ...DEFAULT_SETTINGS,
        maintenance: true,
        purchasesEnabled: false,
        announcement: 'Back soon',
      },
    ]);
    const setting = (
      await db.query<{ maintenance: boolean; purchases_enabled: boolean }>(
        'select * from platform_settings',
      )
    ).rows[0];
    assert.equal(setting.maintenance, true);
    assert.equal(setting.purchases_enabled, false);
    await assert.rejects(
      db.query('select admin_save_settings($1,$2)', [
        admin,
        { ...DEFAULT_SETTINGS, maintenanceMessage: 'bad' },
      ]),
      /invalid_settings/,
    );
    assert.equal(
      (await db.query<{ maintenance: boolean }>('select maintenance from platform_settings'))
        .rows[0].maintenance,
      true,
    );
  } finally {
    await db.close();
  }
});
test('support conversations are restricted to their owner or verified matching email; staff cannot be impersonated', async () => {
  const db = await setup();
  try {
    await db.exec('set role service_role');
    const ticket = (
      await db.query<{ id: string }>(
        "insert into support_tickets(user_id,email,name,subject,message) values ($1,'customer@example.test','Customer','Help please','I need some help with my document') returning id",
        [customer],
      )
    ).rows[0].id;
    const reply = (actor: string, email: string, staff = false) =>
      db.query('select support_reply($1,$2,$3,$4,$5,$6,$7)', [
        actor,
        email,
        ticket,
        'Here is my reply',
        staff,
        'pending',
        'high',
      ]);
    await assert.rejects(reply(other, 'other@example.test'), /ticket_forbidden/);
    await assert.rejects(reply(other, 'customer@example.test'), /ticket_forbidden/);
    await assert.rejects(reply(customer, 'customer@example.test', true), /admin_required/);
    await reply(customer, 'customer@example.test');
    await reply(admin, 'admin@example.test', true);
    const row = (
      await db.query<{ status: string; priority: string }>(
        'select status,priority from support_tickets where id=$1',
        [ticket],
      )
    ).rows[0];
    assert.deepEqual(row, { status: 'pending', priority: 'high' });
    const messages = (
      await db.query<{ staff: boolean }>('select staff from support_messages order by created_at')
    ).rows;
    assert.deepEqual(
      messages.map((m) => m.staff),
      [false, true],
    );
    await db.query('update support_tickets set user_id=null where id=$1', [ticket]);
    await assert.rejects(reply(customer, ''), /ticket_forbidden/);
    await reply(customer, 'CUSTOMER@example.test');
    await db.query('insert into account_controls(user_id,suspended) values ($1,true)', [admin]);
    await assert.rejects(reply(admin, 'admin@example.test', true), /admin_required/);
  } finally {
    await db.close();
  }
});
test('admin payloads cannot assign roles, inject custom price IDs, or alter customer billing through a grant', () => {
  assert.equal(
    adminAction.safeParse({
      action: 'user',
      userId: customer,
      operation: 'make_admin',
      reason: 'Escalate',
      days: 30,
    }).success,
    false,
  );
  assert.equal(
    adminAction.safeParse({
      action: 'pricing',
      requestId: admin,
      expectedVersion: 'initial',
      pricing: { ...DEFAULT_CATALOG, monthlyPriceId: 'price_fake' },
      reason: 'Replace',
    }).success,
    false,
  );
  assert.equal(
    adminAction.safeParse({
      action: 'user',
      userId: customer,
      operation: 'grant',
      reason: 'Goodwill',
      days: 30,
      subscriptionId: 'sub_other',
    }).success,
    false,
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { cloudTestSchema } from './fixtures/cloud-schema';
import { FREE_STORAGE_LIMIT } from '../src/lib/cloud-types';

// Exercise the actual migration and database enforcement, without live user data.
test('free launch gives all accounts and guests 1 GB, unlocks account features, and preserves access controls', async () => {
  const db = new PGlite();
  const owner = randomUUID(),
    other = randomUUID(),
    paid = randomUUID(),
    guest = 'e'.repeat(64);
  const MB = 1024 * 1024;
  try {
    await db.exec(
      'create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),last_sign_in_at timestamptz);',
    );
    await db.exec(cloudTestSchema);
    for (const migration of [
      '001_billing',
      '002_paid_intro',
      '003_platform_admin',
      '004_cloud_documents',
      '005_cloud_recovery',
      '006_editor_autosave',
      '007_admin_user_deletion',
      '008_plan_storage_limits',
      '010_lemon_squeezy',
      '011_guest_dashboard',
      '012_monthly_unlimited_storage',
      '013_short_links',
      '015_invoices',
      '016_free_launch',
    ]) {
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${migration}.sql`, import.meta.url), 'utf8'),
      );
    }
    await db.query('insert into auth.users(id) values($1),($2),($3)', [owner, other, paid]);
    await db.exec('set role service_role');
    await db.query(
      "insert into billing_subscriptions(user_id,stripe_subscription_id,price_id,status,paid_until,current_period_end,monthly_paid) values($1,'sub_month','price_month','active',now()+interval '30 days',now()+interval '30 days',true)",
      [paid],
    );
    for (const actor of [owner, other, paid, null]) {
      const { rows } = await db.query<{ quota: number }>(
        'select account_storage_limit($1)::float8 quota',
        [actor],
      );
      assert.equal(rows[0].quota, FREE_STORAGE_LIMIT);
      assert.equal(rows[0].quota, 1073741824);
    }
    await assert.rejects(
      db.exec('update platform_settings set purchases_enabled=true'),
      /no_purchases_during_free_launch/,
    );
    const reserve = async (actor: string | null, bytes: number) =>
      (
        await db.query<{ doc: { id: string } }>(
          "select reserve_editor_workspace($1,$2,$3,'Example.pdf',$4) doc",
          [actor, actor ? null : guest, randomUUID(), bytes],
        )
      ).rows[0].doc;
    // Metadata reservations do not allocate real gigabyte-sized files.
    for (const actor of [owner, null]) {
      for (let i = 0; i < 20; i++) await reserve(actor, 50 * MB);
      await reserve(actor, 23 * MB);
      const results = await Promise.allSettled([reserve(actor, MB), reserve(actor, MB)]);
      assert.equal(
        results.filter((r) => r.status === 'fulfilled').length,
        1,
        'Only one reservation fits the last MB',
      );
      await assert.rejects(reserve(actor, 1), /storage_limit/);
    }
    const status = (
      await db.query<{ value: { limit: number; used: number; full: boolean } }>(
        'select account_storage_status($1) value',
        [owner],
      )
    ).rows[0].value;
    assert.deepEqual([status.limit, status.used, status.full], [1073741824, 1073741824, true]);
    const doc = await reserve(other, 1);
    await db.query("update cloud_documents set status='ready' where id=$1", [doc.id]);
    await assert.rejects(
      db.query("select save_editor_workspace($1,null,$2,0,'{}','Example.pdf',$3)", [
        owner,
        doc.id,
        randomUUID(),
      ]),
      /workspace_missing/,
    );
    await db.query("select save_editor_workspace($1,null,$2,0,'{}','Example.pdf',$3)", [
      other,
      doc.id,
      randomUUID(),
    ]);
    const invoice = (
      await db.query<{ doc: { id: string } }>("select save_invoice($1,null,null,'{}','{}') doc", [
        owner,
      ])
    ).rows[0].doc;
    await assert.rejects(
      db.query("select save_invoice($1,$2,1,'{}','{}')", [other, invoice.id]),
      /invoice_missing/,
    );
    await db.query("select save_invoice($1,$2,1,'{}','{}')", [owner, invoice.id]);
    const link = (
      await db.query<{ doc: { id: string } }>(
        "select create_short_link($1,'my-free-link','https://example.com','Launch',true) doc",
        [owner],
      )
    ).rows[0].doc;
    await db.query("select update_short_link($1,$2,'https://example.org','New title')", [
      owner,
      link.id,
    ]);
    assert.equal(
      (await db.query<{ value: string }>('select consume_pro_request($1) value', [owner])).rows[0]
        .value,
      'allowed',
    );
    await db.query('insert into account_controls(user_id,suspended) values($1,true)', [owner]);
    assert.equal(
      (await db.query<{ value: string }>('select consume_pro_request($1) value', [owner])).rows[0]
        .value,
      'suspended',
    );
    await assert.rejects(
      db.query("select save_invoice($1,null,null,'{}','{}')", [owner]),
      /suspended/,
    );
    await assert.rejects(
      db.query("select create_short_link($1,'blocked-link','https://example.com','Blocked',true)", [
        owner,
      ]),
      /suspended/,
    );
    await assert.rejects(reserve(owner, 1), /suspended/);
    await db.exec('set role authenticated');
    await assert.rejects(db.exec('select free_access_enabled()'), /permission denied/);
    await assert.rejects(
      db.query("select save_invoice($1,null,null,'{}','{}')", [other]),
      /permission denied/,
    );
    await db.exec('set role service_role');
    // Pricing can only return through an explicit coordinated release, never a timer.
    await db.exec('update platform_settings set free_access_enabled=false');
    assert.equal(
      (await db.query<{ n: number }>('select account_storage_limit($1)::float8 n', [other])).rows[0]
        .n,
      100 * MB,
    );
    assert.equal(
      (await db.query<{ n: boolean }>('select short_link_pro($1) n', [other])).rows[0].n,
      false,
    );
  } finally {
    await db.close();
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { cloudTestSchema } from './fixtures/cloud-schema';
import { FREE_STORAGE_LIMIT, PRO_STORAGE_LIMIT } from '../src/lib/cloud-types';

test('plan storage quotas cover exact uploads, drafts, expiry, deletion and concurrent reservations', async () => {
  const db = new PGlite();
  const free = randomUUID(),
    pro = randomUUID(),
    guest = 'b'.repeat(64),
    MB = 1024 * 1024;
  try {
    await db.exec(
      'create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),last_sign_in_at timestamptz);',
    );
    await db.exec(cloudTestSchema);
    for (const name of [
      '001_billing',
      '002_paid_intro',
      '003_platform_admin',
      '004_cloud_documents',
      '005_cloud_recovery',
      '006_editor_autosave',
      '007_admin_user_deletion',
      '008_plan_storage_limits',
    ])
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8'),
      );
    await db.query('insert into auth.users(id) values($1),($2)', [free, pro]);
    await db.exec('set role service_role');
    const limit = async (id: string) =>
      (await db.query<{ n: number }>('select account_storage_limit($1)::float8 n', [id])).rows[0].n;
    const used = async (id: string) =>
      (await db.query<{ n: number }>('select account_storage_used($1)::float8 n', [id])).rows[0].n;
    const reserve = async (id: string, size: number) =>
      (
        await db.query<{ doc: { id: string; object_path: string } }>(
          "select reserve_cloud_document($1,'Example.pdf',$2) doc",
          [id, size],
        )
      ).rows[0].doc;
    const remove = async (id: string) => {
      // Simulate confirmed Storage removal followed by metadata removal.
      await db.query(
        "delete from storage.objects where bucket_id='folio-documents' and name=(select object_path from cloud_documents where id=$1)",
        [id],
      );
      await db.query('delete from cloud_documents where id=$1', [id]);
    };
    assert.equal(await limit(free), FREE_STORAGE_LIMIT);
    await db.query(
      "insert into billing_subscriptions(user_id,stripe_subscription_id,price_id,status,paid_until,current_period_end) values($1,'sub_plan','price_plan','trialing',null,now()+interval '7 days')",
      [pro],
    );
    assert.equal(await limit(pro), FREE_STORAGE_LIMIT, 'An unpaid trial is not Pro');
    await db.query(
      "update billing_subscriptions set paid_until=now()+interval '7 days' where user_id=$1",
      [pro],
    );
    assert.equal(
      await limit(pro),
      PRO_STORAGE_LIMIT,
      'Paid introductory trial receives Pro storage',
    );
    await db.query(
      "update billing_subscriptions set status='active',cancel_at_period_end=true where user_id=$1",
      [pro],
    );
    assert.equal(
      await limit(pro),
      PRO_STORAGE_LIMIT,
      'Scheduled cancellation keeps paid storage until expiry',
    );

    const first = await reserve(free, 49 * MB);
    const second = await reserve(free, 50 * MB);
    const contenders = await Promise.allSettled([reserve(free, MB), reserve(free, MB)]);
    assert.equal(contenders.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(
      await used(free),
      FREE_STORAGE_LIMIT,
      'Exact sizes, including unfinished uploads, fill the allowance',
    );
    await assert.rejects(reserve(free, 1), /storage_limit/);
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name,metadata) values('folio-documents',$1,$2)",
        [first.object_path, JSON.stringify({ size: 50 * MB })],
      ),
      /storage_upload_size/,
      'Actual bytes cannot exceed the reserved size',
    );
    await db.query(
      "insert into storage.objects(bucket_id,name,metadata) values('folio-documents',$1,$2)",
      [first.object_path, JSON.stringify({ size: 49 * MB })],
    );
    await db.query("update cloud_documents set status='ready' where id=$1", [first.id]);
    const save = (snapshot: object, revision: number) =>
      db.query("select save_editor_workspace($1,null,$2,$3,$4,'Example.pdf',$5)", [
        free,
        first.id,
        revision,
        JSON.stringify(snapshot),
        randomUUID(),
      ]);
    await assert.rejects(
      save({ edit: 'Text' }, 0),
      /storage_limit/,
      'Saved editor state counts too',
    );
    await db.query("update cloud_documents set status='deleting' where id=$1", [second.id]);
    await assert.rejects(
      reserve(free, 1),
      /storage_limit/,
      'A failed delete does not free its reservation',
    );
    await remove(second.id);
    await save({ edit: 'Text' }, 0);
    assert.ok((await used(free)) > 50 * MB);

    // Recovery writes are enforced even with elevated Storage completion privileges.
    const recoveryPath = `${free}/pro-text.json`;
    await db.query(
      "insert into storage.objects(bucket_id,name,metadata) values('folio-recovery',$1,$2)",
      [recoveryPath, JSON.stringify({ size: 40 * MB })],
    );
    assert.ok((await used(free)) > 90 * MB);
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name,metadata) values('folio-recovery',$1,$2)",
        [`${free}/translate-pdf.json`, JSON.stringify({ size: 11 * MB })],
      ),
      /storage_limit/,
    );
    // Storage uses INSERT ... ON CONFLICT for replacement; do not double-count the old draft.
    await db.exec(
      'reset role; create unique index test_storage_object_names on storage.objects(bucket_id,name); set role service_role;',
    );
    await db.query(
      "insert into storage.objects(bucket_id,name,metadata) values('folio-recovery',$1,$2) on conflict(bucket_id,name) do update set metadata=excluded.metadata",
      [recoveryPath, JSON.stringify({ size: 35 * MB })],
    );
    assert.ok((await used(free)) < 86 * MB);
    const usage = (
      await db.query<{
        value: { limit: number; used: number; recovery: { slot: string; size: number }[] };
      }>('select account_storage_status($1) value', [free])
    ).rows[0].value;
    assert.equal(usage.limit, FREE_STORAGE_LIMIT);
    assert.deepEqual(usage.recovery, [{ slot: 'pro-text', size: 35 * MB }]);
    await db.query("delete from storage.objects where bucket_id='folio-recovery' and name=$1", [
      recoveryPath,
    ]);
    await reserve(free, 40 * MB);

    const guestId = randomUUID();
    await db.query("select reserve_editor_workspace(null,$1,$2,'Guest.pdf',$3)", [
      guest,
      guestId,
      20 * MB,
    ]);
    await assert.rejects(
      db.query('select claim_editor_workspace($1,$2,$3)', [free, guest, guestId]),
      /storage_limit/,
      'Signing in cannot bypass quota by claiming guest files',
    );
    const proFiles = [];
    for (let i = 0; i < 20; i++) proFiles.push(await reserve(pro, 50 * MB));
    proFiles.push(await reserve(pro, 24 * MB));
    assert.equal(await used(pro), PRO_STORAGE_LIMIT);
    await assert.rejects(reserve(pro, 1), /storage_limit/);
    await db.query(
      "update billing_subscriptions set paid_until=now()-interval '1 second' where user_id=$1",
      [pro],
    );
    assert.equal(await limit(pro), FREE_STORAGE_LIMIT);
    assert.equal(await used(pro), PRO_STORAGE_LIMIT, 'Downgrades preserve existing files');
    await assert.rejects(reserve(pro, 1), /storage_limit/);
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name,metadata) values('folio-documents',$1,$2)",
        [proFiles[0].object_path, JSON.stringify({ size: 50 * MB })],
      ),
      /storage_limit/,
      'Old upload authorization cannot bypass a downgrade',
    );
    await db.query(
      "insert into access_grants(user_id,until_at,reason) values($1,now()+interval '1 day','Courtesy access')",
      [pro],
    );
    assert.equal(await limit(pro), PRO_STORAGE_LIMIT);
    await remove(proFiles[0].id);
    await reserve(pro, 10 * MB);
    await db.query("update access_grants set until_at=now()-interval '1 second' where user_id=$1", [
      pro,
    ]);
    assert.equal(await limit(pro), FREE_STORAGE_LIMIT);
    for (const file of proFiles.slice(1, 20)) await remove(file.id);
    await reserve(pro, 50 * MB);
    assert.equal(await used(pro), 84 * MB, 'Deleting enough old files allows uploads again');

    await db.exec('set role authenticated');
    await assert.rejects(db.query('select account_storage_status($1)', [pro]), /permission denied/);
    await db.exec('set role service_role');
    await db.query('insert into account_controls(user_id,suspended) values($1,true)', [free]);
    await assert.rejects(reserve(free, 1), /suspended/);
  } finally {
    await db.close();
  }
});

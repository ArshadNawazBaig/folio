import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { cloudTestSchema } from './fixtures/cloud-schema';
import { CLOUD_FILE_LIMIT, CLOUD_STORAGE_LIMIT, pdfName } from '../src/lib/cloud-types';
const alice = '00000000-0000-4000-8000-000000000001';
const bob = '00000000-0000-4000-8000-000000000002';
test('private storage enforces ownership even with broad existing bucket policies', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      'create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),last_sign_in_at timestamptz);',
    );
    await db.exec(cloudTestSchema);
    for (const name of [
      '001_billing.sql',
      '002_paid_intro.sql',
      '003_platform_admin.sql',
      '004_cloud_documents.sql',
      '006_editor_autosave.sql',
      '005_cloud_recovery.sql',
    ])
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'),
      );
    await db.query('insert into auth.users(id) values($1),($2)', [alice, bob]);
    await db.exec(
      'create policy broad_legacy_policy on storage.objects for all to anon,authenticated using(true) with check(true);',
    );
    await db.exec('set role service_role');
    const reserve = async (who: string, size: number) =>
      (
        await db.query<{ file: { id: string; object_path: string } }>(
          "select reserve_cloud_document($1,'Example.pdf',$2) as file",
          [who, size],
        )
      ).rows[0].file;
    const first = await reserve(alice, 20);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [alice]);
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from cloud_documents'), /permission denied/);
    await assert.rejects(
      db.query("select reserve_cloud_document($1,'Fake.pdf',1)", [alice]),
      /permission denied/,
    );
    await db.query("insert into storage.objects(bucket_id,name) values('folio-documents',$1)", [
      first.object_path,
    ]);
    assert.equal(
      (await db.query('select * from storage.objects')).rows.length,
      0,
      'Incomplete uploads cannot be read',
    );
    await db.exec('set role service_role');
    await db.query("update cloud_documents set status='ready' where id=$1", [first.id]);
    await db.exec('set role authenticated');
    assert.equal((await db.query('select * from storage.objects')).rows.length, 1);
    assert.equal((await db.query('delete from storage.objects returning *')).rows.length, 0);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [bob]);
    assert.equal(
      (await db.query('select * from storage.objects')).rows.length,
      0,
      'Other accounts cannot read objects',
    );
    await assert.rejects(
      db.query("insert into storage.objects(bucket_id,name) values('folio-documents',$1)", [
        first.object_path,
      ]),
      /row-level security/,
    );
    await db.exec('set role anon');
    assert.equal((await db.query('select * from storage.objects')).rows.length, 0);
    await assert.rejects(
      db.query("insert into storage.objects(bucket_id,name) values('folio-documents','anything')"),
      /row-level security/,
    );
    await db.exec('set role service_role');
    const pending = await reserve(bob, 1);
    for (let i = 1; i < CLOUD_STORAGE_LIMIT / CLOUD_FILE_LIMIT; i++) await reserve(bob, 1);
    await assert.rejects(
      reserve(bob, 1),
      /storage_limit/,
      'Pending uploads reserve their maximum size',
    );
    await db.query("update cloud_documents set status='ready' where id=$1", [pending.id]);
    // Still less than a full upload slot remains: reservations do not oversubscribe quota.
    await assert.rejects(reserve(bob, 1), /storage_limit/);
    await db.query('delete from cloud_documents where id=$1', [pending.id]);
    await reserve(bob, 1);
    await db.query('insert into account_controls(user_id,suspended) values($1,true)', [alice]);
    await assert.rejects(reserve(alice, 1), /suspended/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [alice]);
    await db.exec('set role authenticated');
    assert.equal(
      (await db.query('select * from storage.objects')).rows.length,
      0,
      'Suspended accounts cannot download directly from Storage',
    );
    await db.exec('set role service_role');
    await db.query('update account_controls set suspended=false where user_id=$1', [alice]);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [alice]);
    await db.exec('set role authenticated');
    const recoveryPath = alice + '/pro-text.json';
    await db.query("insert into storage.objects(bucket_id,name) values('folio-recovery',$1)", [
      recoveryPath,
    ]);
    await assert.rejects(
      db.query("insert into storage.objects(bucket_id,name) values('folio-recovery',$1)", [
        alice + '/unlimited-file.json',
      ]),
      /row-level security/,
    );
    await db.query(
      "update storage.objects set metadata='{}'::jsonb where bucket_id='folio-recovery'",
    );
    assert.equal(
      (await db.query("select * from storage.objects where bucket_id='folio-recovery'")).rows
        .length,
      1,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [bob]);
    assert.equal(
      (await db.query("select * from storage.objects where bucket_id='folio-recovery'")).rows
        .length,
      0,
    );
    assert.equal(
      (await db.query("delete from storage.objects where bucket_id='folio-recovery' returning *"))
        .rows.length,
      0,
    );
    await assert.rejects(
      db.query("insert into storage.objects(bucket_id,name) values('folio-recovery',$1)", [
        recoveryPath,
      ]),
      /row-level security/,
    );
    await db.exec('set role anon');
    assert.equal(
      (await db.query("select * from storage.objects where bucket_id='folio-recovery'")).rows
        .length,
      0,
    );
    await db.exec('set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [alice]);
    assert.equal(
      (await db.query("delete from storage.objects where bucket_id='folio-recovery' returning *"))
        .rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
test('cloud file names stay bounded and cannot become storage paths', () => {
  assert.equal(pdfName(' ../private/report.PDF '), '..-private-report.pdf');
  assert.equal(pdfName(''), 'Untitled document.pdf');
  assert.equal(pdfName('x'.repeat(300)).length, 160);
});

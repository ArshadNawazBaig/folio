import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { cloudTestSchema } from './fixtures/cloud-schema';
import { FREE_STORAGE_LIMIT } from '../src/lib/cloud-types';

test('guest libraries enforce 100 MB, isolate owners, expire after 24 hours and safely transfer all files that fit', async () => {
  const db = new PGlite();
  const guest = 'd'.repeat(64),
    otherGuest = 'e'.repeat(64),
    actor = randomUUID(),
    other = randomUUID();
  const MB = 1024 * 1024;
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
      '010_lemon_squeezy',
      '011_guest_dashboard',
      '012_monthly_unlimited_storage',
    ])
      await db.exec(
        await readFile(new URL(`../supabase/migrations/${name}.sql`, import.meta.url), 'utf8'),
      );
    await db.query('insert into auth.users(id) values($1),($2)', [actor, other]);
    await db.exec('set role service_role');
    const reserve = async (size: number, hash = guest, id = randomUUID()) => {
      const result = await db.query<{
        doc: { id: string; object_path: string; expires_at: string };
      }>("select reserve_editor_workspace(null,$1,$2,'Guest.pdf',$3) doc", [hash, id, size]);
      return result.rows[0].doc;
    };
    const first = await reserve(50 * MB);
    assert.ok(Math.abs(Date.parse(first.expires_at) - Date.now() - 86400000) < 10000);
    const contenders = await Promise.allSettled([reserve(50 * MB), reserve(50 * MB)]);
    assert.equal(contenders.filter((result) => result.status === 'fulfilled').length, 1);
    await assert.rejects(reserve(1), /storage_limit/);
    await db.query("update cloud_documents set status='ready' where id=$1", [first.id]);
    await assert.rejects(
      db.query(
        'select save_editor_workspace(null,$1,$2,0,\'{"edit":"new text"}\',\'Guest.pdf\',$3)',
        [guest, first.id, randomUUID()],
      ),
      /storage_limit/,
      'Editor snapshots count toward the same 100 MB',
    );
    await assert.rejects(
      db.query("select manage_editor_workspace(null,$1,$2,'rename','Stolen.pdf',0)", [
        otherGuest,
        first.id,
      ]),
      /workspace_missing/,
    );
    await assert.rejects(
      db.query("select manage_editor_workspace($1,null,$2,'delete',null,null)", [other, first.id]),
      /workspace_missing/,
    );
    await db.query("select manage_editor_workspace(null,$1,$2,'rename','Renamed.pdf',0)", [
      guest,
      first.id,
    ]);
    await assert.rejects(
      db.query("select manage_editor_workspace(null,$1,$2,'rename','Stale.pdf',0)", [
        guest,
        first.id,
      ]),
      /workspace_conflict/,
    );
    await db.query("select manage_editor_workspace(null,$1,$2,'delete',null,null)", [
      guest,
      first.id,
    ]);
    await assert.rejects(
      reserve(1),
      /storage_limit/,
      'Failed Storage deletion keeps its quota reserved',
    );
    await db.query('delete from cloud_documents where id=$1', [first.id]);
    for (let i = 0; i < 6; i++) await reserve(1);
    assert.equal(
      (await db.query<{ n: number }>('select count(*)::int n from cloud_documents')).rows[0].n,
      7,
      'Guests are no longer restricted to four small files',
    );
    await db.query("update cloud_documents set expires_at=now()-interval '1 second' where size>1");
    const third = await reserve(50 * MB);
    assert.ok(third.id);
    await db.query('delete from cloud_documents');

    const existing = (
      await db.query<{ doc: { id: string } }>(
        "select reserve_cloud_document($1,'Account.pdf',$2) doc",
        [actor, (80 * MB) / 2],
      )
    ).rows[0].doc;
    const existing2 = (
      await db.query<{ doc: { id: string } }>(
        "select reserve_cloud_document($1,'Account 2.pdf',$2) doc",
        [actor, 40 * MB],
      )
    ).rows[0].doc;
    const large = await reserve(50 * MB);
    const small = await reserve(20 * MB);
    const expired = await reserve(1);
    await db.query("update cloud_documents set expires_at=now()-interval '1 second' where id=$1", [
      expired.id,
    ]);
    const claim = async (user = actor) =>
      (
        await db.query<{ result: { claimed: number; remaining: number } }>(
          'select claim_guest_workspaces($1,$2) result',
          [user, guest],
        )
      ).rows[0].result;
    assert.deepEqual(await claim(), { claimed: 1, remaining: 1 });
    assert.equal(
      (await db.query<{ used: number }>('select account_storage_used($1)::float8 used', [actor]))
        .rows[0].used,
      FREE_STORAGE_LIMIT,
    );
    const smallRow = (
      await db.query<{ user_id: string; expires_at: null; object_path: string }>(
        'select user_id,expires_at,object_path from cloud_documents where id=$1',
        [small.id],
      )
    ).rows[0];
    assert.equal(smallRow.user_id, actor);
    assert.equal(smallRow.expires_at, null);
    assert.equal(
      smallRow.object_path,
      small.object_path,
      'Claiming does not copy or replace PDF bytes',
    );
    await db.query('delete from cloud_documents where id=$1 or id=$2', [existing.id, existing2.id]);
    assert.deepEqual(await claim(), { claimed: 1, remaining: 0 });
    assert.deepEqual(await claim(), { claimed: 0, remaining: 0 }, 'Retries are idempotent');
    assert.equal(
      (
        await db.query<{ user_id: string }>('select user_id from cloud_documents where id=$1', [
          large.id,
        ])
      ).rows[0].user_id,
      actor,
    );
    assert.equal(
      (
        await db.query<{ user_id: null }>('select user_id from cloud_documents where id=$1', [
          expired.id,
        ])
      ).rows[0].user_id,
      null,
    );
    await assert.rejects(
      db.query("select manage_editor_workspace(null,$1,$2,'delete',null,null)", [guest, small.id]),
      /workspace_missing/,
      'Old guest cookies lose access after sign-in',
    );

    await db.query('insert into account_controls(user_id,suspended) values($1,true)', [actor]);
    await assert.rejects(claim(), /suspended/);
    await assert.rejects(
      db.query("select manage_editor_workspace($1,null,$2,'delete',null,null)", [actor, small.id]),
      /suspended/,
    );
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(claim(other), /permission denied/);
      await assert.rejects(
        db.query("select manage_editor_workspace(null,$1,$2,'delete',null,null)", [
          guest,
          expired.id,
        ]),
        /permission denied/,
      );
    }
  } finally {
    await db.close();
  }
});

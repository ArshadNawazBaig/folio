import assert from 'node:assert/strict';
import type { PGlite } from '@electric-sql/pglite';
import * as links from '../../src/app/api/account/links/route';
import * as link from '../../src/app/api/account/links/[id]/route';
import * as redirect from '../../src/app/s/[alias]/route';

export async function verifyShortLinks(
  db: PGlite,
  request: (route: string, actor?: string, body?: unknown) => Request,
  owner: string,
  other: string,
) {
  const create = (body: unknown, actor: string | undefined = owner) =>
    links.POST(request('/api/account/links', actor, body));
  const mutate = (id: string, actor: string, body?: unknown) =>
    (body ? link.PATCH : link.DELETE)(
      new Request(request('/api/account/links/' + id, actor, body), {
        method: body ? 'PATCH' : 'DELETE',
      }),
      { params: Promise.resolve({ id }) },
    );
  const follow = (alias: string) =>
    redirect.GET(request('/s/' + alias + '?destination=https://attacker.example'), {
      params: Promise.resolve({ alias }),
    });
  assert.equal(
    (
      await links.POST(
        request('/api/account/links', undefined, { destination: 'https://example.com' }),
      )
    ).status,
    401,
  );
  assert.equal((await links.GET(request('/api/account/links'))).status, 401);
  assert.equal((await create({ destination: 'javascript:alert(1)' })).status, 400);
  assert.equal(
    (await create({ destination: 'https://example.com', alias: 'free-custom' })).status,
    402,
  );
  assert.equal((await create({ destination: 'https://example.com', user_id: other })).status, 400);

  // Both paid trials and monthly access qualify; revocation and either expired boundary deny it.
  await db.query(
    "insert into billing_subscriptions(stripe_subscription_id,user_id,price_id,status,paid_until,current_period_end,cancel_at_period_end) values('short-link-plan',$1,'test','trialing',now()+interval '1 day',now()+interval '1 day',true)",
    [owner],
  );
  for (const status of ['trialing', 'active']) {
    await db.query(
      "update billing_subscriptions set status=$1 where stripe_subscription_id='short-link-plan'",
      [status],
    );
    assert.equal(
      (await db.query<{ pro: boolean }>('select short_link_pro($1) pro', [owner])).rows[0].pro,
      true,
    );
  }
  for (const change of [
    'access_revoked=true',
    "paid_until=now()-interval '1 second'",
    "current_period_end=now()-interval '1 second'",
    "status='past_due'",
  ]) {
    await db.exec(
      "update billing_subscriptions set status='active',access_revoked=false,paid_until=now()+interval '1 day',current_period_end=now()+interval '1 day' where stripe_subscription_id='short-link-plan'",
    );
    await db.exec(
      `update billing_subscriptions set ${change} where stripe_subscription_id='short-link-plan'`,
    );
    assert.equal(
      (await db.query<{ pro: boolean }>('select short_link_pro($1) pro', [owner])).rows[0].pro,
      false,
    );
  }
  await db.exec("delete from billing_subscriptions where stripe_subscription_id='short-link-plan'");
  const response = await create({
    destination: 'https://example.com/a?x=1#section',
    title: 'My campaign',
  });
  assert.equal(response.status, 201, await response.clone().text());
  const saved = (await response.json()).link;
  assert.match(saved.alias, /^[a-f0-9]{12}$/);
  assert.ok(saved.shortUrl.endsWith('/s/' + saved.alias));
  assert.equal(saved.user_id, undefined);
  const redirected = await follow(saved.alias);
  assert.equal(redirected.status, 302);
  assert.equal(redirected.headers.get('location'), saved.destination);
  assert.equal(redirected.headers.get('cache-control'), 'no-store');
  assert.equal(redirected.headers.get('x-robots-tag'), 'noindex, nofollow');
  const empty = await (await links.GET(request('/api/account/links', other))).json();
  assert.equal(empty.total, 0);
  assert.equal(
    (await mutate(saved.id, other, { destination: 'https://example.com/other', title: 'Stolen' }))
      .status,
    404,
  );
  assert.equal((await mutate(saved.id, other)).status, 404);
  assert.equal(
    (await mutate(saved.id, owner, { destination: 'https://example.com/changed', title: 'Mine' }))
      .status,
    402,
  );
  assert.equal(
    (await mutate(saved.id, owner, { destination: saved.destination, title: 'Renamed' })).status,
    200,
  );
  const malicious = await links.GET(
    request('/api/account/links?q=' + encodeURIComponent('%,user_id.eq.' + other), owner),
  );
  assert.equal(malicious.status, 200);
  assert.equal((await malicious.json()).total, 0);
  const search = await links.GET(request('/api/account/links?q=Renamed', owner));
  assert.equal((await search.json()).links[0].id, saved.id);
  assert.equal((await links.GET(request('/api/account/links?pageSize=999', owner))).status, 400);

  // Concurrent creates cannot cross the Free quota.
  const free = await Promise.all(
    Array.from({ length: 12 }, () => create({ destination: 'https://example.com' })),
  );
  assert.equal(free.filter((r) => r.status === 201).length, 9);
  assert.equal(free.filter((r) => r.status === 409).length, 3);
  await db.query(
    "insert into access_grants(user_id,until_at,reason) values($1,now()+interval '1 day','Link test')",
    [owner],
  );
  const custom = await create({ destination: 'https://example.com/offer', alias: 'My-Campaign' });
  assert.equal(custom.status, 201, await custom.clone().text());
  const branded = (await custom.json()).link;
  assert.equal(branded.alias, 'my-campaign');
  assert.equal(
    (await create({ destination: 'https://example.com', alias: 'my-campaign' })).status,
    409,
  );
  assert.equal(
    (await mutate(branded.id, owner, { destination: 'https://example.com/new', title: 'New' }))
      .status,
    200,
  );
  assert.equal((await follow(branded.alias)).headers.get('location'), 'https://example.com/new');
  const secondPage = await (await links.GET(request('/api/account/links?page=2', owner))).json();
  assert.equal(secondPage.links.length, 1);
  assert.equal(secondPage.limit, 1000);
  assert.equal((await links.GET(request('/api/account/links?page=99', owner))).status, 200);
  await db.query("update access_grants set until_at=now()-interval '1 second' where user_id=$1", [
    owner,
  ]);
  assert.equal((await follow(branded.alias)).status, 302, 'Downgrade does not break shared links');
  assert.equal((await create({ destination: 'https://example.com' })).status, 409);
  assert.equal(
    (
      await mutate(branded.id, owner, {
        destination: 'https://example.com/new',
        title: 'Free rename',
      })
    ).status,
    200,
  );
  assert.equal(
    (await mutate(branded.id, owner, { destination: 'https://example.com/again', title: 'No' }))
      .status,
    402,
  );
  assert.equal((await mutate(branded.id, owner)).status, 204);
  assert.equal((await follow(branded.alias)).status, 404);
  await db.query("update access_grants set until_at=now()+interval '1 day' where user_id=$1", [
    owner,
  ]);
  assert.equal(
    (await create({ destination: 'https://example.com', alias: branded.alias })).status,
    409,
    'Deleted aliases cannot be reused',
  );

  await db.query(
    "update short_link_usage set minute_count=20,minute_at=date_trunc('minute',now()) where user_id=$1",
    [owner],
  );
  assert.equal((await create({ destination: 'https://example.com' })).status, 429);
  await db.query('update short_link_usage set minute_count=0,day_count=1000 where user_id=$1', [
    owner,
  ]);
  assert.equal((await create({ destination: 'https://example.com' })).status, 429);
  // The larger Pro quota is enforced independently of the creation rate.
  await db.query('update short_link_usage set day_count=0 where user_id=$1', [owner]);
  await db.exec("insert into short_link_codes select 'quota-'||i from generate_series(1,990) i");
  await db.query(
    "insert into short_links(user_id,alias,destination) select $1,'quota-'||i,'https://example.com' from generate_series(1,990) i",
    [owner],
  );
  assert.equal((await create({ destination: 'https://example.com' })).status, 409);
  await db.query(
    "insert into account_controls(user_id,suspended,reason) values($1,true,'Testing')",
    [owner],
  );
  assert.equal((await follow(saved.alias)).status, 404);
  assert.equal((await links.GET(request('/api/account/links', owner))).status, 403);
  assert.equal((await follow('missing-link')).status, 404);
  assert.equal((await follow('Bad!')).status, 404);

  for (const role of ['anon', 'authenticated']) {
    await db.exec('reset role');
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query('select * from short_links'), /permission denied/);
    await assert.rejects(db.query("select resolve_short_link('my-campaign')"), /permission denied/);
    await assert.rejects(
      db.query("select create_short_link($1,'bypass','https://example.com','',false)", [owner]),
      /permission denied/,
    );
  }
  await db.exec('reset role');
  // Auth deletion clears private link data but keeps the alias unavailable.
  const deletedUser = '00000000-0000-4000-8000-000000000099';
  await db.query('insert into auth.users(id) values($1)', [deletedUser]);
  await db.query("select create_short_link($1,'deleted-user','https://example.com','',false)", [
    deletedUser,
  ]);
  await db.query('delete from auth.users where id=$1', [deletedUser]);
  assert.equal((await follow('deleted-user')).status, 404);
  assert.equal(
    (await db.query("select * from short_link_codes where alias='deleted-user'")).rows.length,
    1,
  );
  assert.equal(
    (await db.query('select * from short_link_usage where user_id=$1', [deletedUser])).rows.length,
    0,
  );
  await db.exec('set role service_role');
  await db.query('delete from short_links where user_id=$1', [owner]);
  await db.query('delete from short_link_usage where user_id=$1', [owner]);
  await db.query('delete from access_grants where user_id=$1', [owner]);
  await db.query('delete from account_controls where user_id=$1', [owner]);
}

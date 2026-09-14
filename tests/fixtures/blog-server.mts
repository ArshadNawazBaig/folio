import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { PGlite } from '@electric-sql/pglite';
import { cloudTestSchema } from './cloud-schema';
import * as posts from '../../src/app/api/admin/blog/route';
import * as post from '../../src/app/api/admin/blog/[id]/route';
import * as revisions from '../../src/app/api/admin/blog/[id]/revisions/route';
import * as images from '../../src/app/api/admin/blog/[id]/images/route';
import * as likes from '../../src/app/api/blog/[id]/like/route';
import { publicPosts, publicPostBySlug, blogSitemap } from '../../src/lib/server/blog';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://blog-tests.example.test';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-public';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
const db = new PGlite(),
  admin = randomUUID(),
  reader = randomUUID(),
  other = randomUUID();
await db.exec(
  'create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,created_at timestamptz default now(),last_sign_in_at timestamptz);',
);
await db.exec(cloudTestSchema);
for (const name of ['001_billing', '002_paid_intro', '003_platform_admin', '009_blog'])
  await db.exec(
    await readFile(new URL(`../../supabase/migrations/${name}.sql`, import.meta.url), 'utf8'),
  );
await db.query('insert into auth.users(id) values($1),($2),($3)', [admin, reader, other]);
await db.query('insert into super_admins(user_id) values($1)', [admin]);
await db.exec('set role service_role');
const ident = (s: string) => {
  assert.match(s, /^[a-z_]+$/);
  return `"${s}"`;
};
const field = (s: string) => {
  if (s.includes('->>')) {
    const [col, key] = s.split('->>');
    assert.ok(['title', 'category'].includes(key));
    return `${ident(col)}->>'${key}'`;
  }
  return ident(s);
};
let failDatabase = false,
  uploaded = false;
globalThis.fetch = async (input, init) => {
  const req = new Request(input, init),
    url = new URL(req.url);
  assert.equal(url.hostname, 'blog-tests.example.test', 'Tests never contact a real service');
  if (url.pathname === '/auth/v1/user') {
    const id = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!new Set<string>([admin, reader, other]).has(id || ''))
      return Response.json({ message: 'Invalid JWT' }, { status: 401 });
    return Response.json({
      id,
      email: 'reader@example.test',
      email_confirmed_at: new Date().toISOString(),
      user_metadata: { role: 'super_admin' },
      app_metadata: {},
      aud: 'authenticated',
    });
  }
  assert.equal(req.headers.get('apikey'), 'test-service');
  if (url.pathname.startsWith('/storage/v1/object/folio-blog/')) {
    assert.equal(req.method, 'POST');
    assert.equal(req.headers.get('content-type'), 'image/webp');
    uploaded = true;
    return Response.json({ Key: url.pathname.split('/object/')[1] });
  }
  try {
    if (failDatabase && url.pathname.includes('blog_')) throw new Error('Database unavailable');
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const name = url.pathname.split('/').pop()!,
        body = await req.json(),
        keys = Object.keys(body);
      const result = await db.query<{ value: unknown }>(
        `select public.${ident(name)}(${keys.map((k, i) => `${ident(k)} => $${i + 1}`).join(',')}) value`,
        Object.values(body),
      );
      return Response.json(result.rows[0].value);
    }
    const table = url.pathname.split('/').pop()!;
    assert.ok(
      ['account_controls', 'super_admins', 'blog_posts', 'blog_revisions', 'blog_likes'].includes(
        table,
      ),
    );
    const args: unknown[] = [],
      where: string[] = [];
    for (const [k, v] of url.searchParams) {
      if (['select', 'order', 'limit', 'offset'].includes(k)) continue;
      const index = v.indexOf('.'),
        op = v.slice(0, index),
        value = v.slice(index + 1);
      const operators: Record<string, string> = {
        eq: '=',
        neq: '<>',
        gt: '>',
        lte: '<=',
        ilike: 'ilike',
      };
      assert.ok(operators[op]);
      where.push(`${field(k)} ${operators[op]} $${args.push(value)}`);
    }
    const conditions = where.length ? ` where ${where.join(' and ')}` : '';
    const count = (
      await db.query<{ n: number }>(
        `select count(*)::int n from ${ident(table)}${conditions}`,
        args,
      )
    ).rows[0].n;
    const fields = (url.searchParams.get('select') || '*')
      .split(',')
      .map((f) => (f === '*' ? f : ident(f)))
      .join(',');
    const order = (url.searchParams.get('order') || '')
      .split(',')
      .filter(Boolean)
      .map((item) => {
        const [key, dir] = item.split('.');
        return `${ident(key)} ${dir === 'desc' ? 'desc' : 'asc'}`;
      })
      .join(',');
    const limit = Number(url.searchParams.get('limit') || 1000),
      offset = Number(url.searchParams.get('offset') || 0);
    assert.ok(Number.isInteger(limit) && Number.isInteger(offset));
    const result = await db.query(
      `select ${fields} from ${ident(table)}${conditions}${order ? ` order by ${order}` : ''} limit ${limit} offset ${offset}`,
      args,
    );
    if (req.headers.get('accept')?.includes('vnd.pgrst.object'))
      return result.rows.length
        ? Response.json(result.rows[0])
        : Response.json(
            { code: 'PGRST116', details: 'The result contains 0 rows' },
            { status: 406 },
          );
    return Response.json(result.rows, {
      headers: { 'content-range': `0-${Math.max(0, result.rows.length - 1)}/${count}` },
    });
  } catch (e) {
    return Response.json(
      {
        message: e instanceof Error ? e.message : String(e),
        code: (e as { code?: string }).code || 'P0001',
      },
      { status: 400 },
    );
  }
};
const request = (actor?: string, body?: unknown, method = body ? 'PUT' : 'GET') =>
  new Request('http://localhost/api/admin/blog', {
    method,
    headers: {
      ...(actor ? { authorization: `Bearer ${actor}` } : {}),
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const id = randomUUID(),
  context = { params: Promise.resolve({ id }) };
try {
  assert.equal((await posts.GET(request())).status, 401);
  assert.equal((await posts.POST(request(reader, { id }, 'POST'))).status, 403);
  assert.equal((await posts.POST(request(admin, { id }, 'POST'))).status, 201);
  let current = (await (await post.GET(request(admin), context)).json()).post;
  assert.equal(current.version, 1);
  assert.equal((await publicPosts()).total, 0);
  const draft = {
    ...current.draft,
    title: 'A thoughtful PDF workflow',
    slug: 'thoughtful-pdf-workflow',
    excerpt: 'A practical guide to working with documents.',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Make space for better work with a clear document workflow.' },
          ],
        },
      ],
    },
  };
  let response = await post.PUT(request(reader, { draft, version: 1 }), context);
  assert.equal(response.status, 403);
  response = await post.PUT(request(admin, { draft, version: 1 }), context);
  assert.equal(response.status, 200);
  current = (await response.json()).post;
  assert.equal((await post.PUT(request(admin, { draft, version: 1 }), context)).status, 409);
  assert.equal(await publicPostBySlug(draft.slug), null);
  assert.equal((await likes.PUT(request(reader, { liked: true }), context)).status, 404);
  response = await post.PUT(
    request(admin, {
      draft,
      version: current.version,
      operation: 'publish',
      publishAt: new Date(Date.now() + 86400000).toISOString(),
    }),
    context,
  );
  assert.equal(response.status, 200);
  current = (await response.json()).post;
  assert.equal((await publicPosts()).total, 0, 'Scheduled articles stay private until their date');
  response = await post.PUT(
    request(admin, {
      draft,
      version: current.version,
      operation: 'publish',
      publishAt: new Date(Date.now() - 1000).toISOString(),
    }),
    context,
  );
  current = (await response.json()).post;
  assert.equal((await publicPosts()).total, 1);
  assert.equal((await publicPostBySlug(draft.slug))?.title, draft.title);
  assert.equal((await blogSitemap())[0].public_slug, draft.slug);
  assert.equal((await publicPosts(1, 'thoughtful')).total, 1);
  assert.equal((await publicPosts(1, 'no match')).total, 0);
  const changed = { ...draft, title: 'Private draft changes', slug: 'new-draft-slug' };
  response = await post.PUT(request(admin, { draft: changed, version: current.version }), context);
  current = (await response.json()).post;
  assert.equal(
    (await publicPostBySlug(draft.slug))?.title,
    draft.title,
    'Saved edits do not alter the live snapshot',
  );
  assert.equal(await publicPostBySlug(changed.slug), null);
  assert.equal((await likes.PUT(request(undefined, { liked: true }), context)).status, 401);
  for (let i = 0; i < 3; i++) {
    response = await likes.PUT(request(reader, { liked: true }), context);
    assert.deepEqual(await response.json(), { liked: true, count: 1 });
  }
  assert.deepEqual(await (await likes.GET(request(reader), context)).json(), {
    liked: true,
    count: 1,
  });
  assert.deepEqual(await (await likes.GET(request(other), context)).json(), {
    liked: false,
    count: 1,
  });
  assert.deepEqual(await (await likes.PUT(request(reader, { liked: false }), context)).json(), {
    liked: false,
    count: 0,
  });
  await likes.PUT(request(other, { liked: true }), context);
  await db.exec('reset role');
  await db.query('delete from auth.users where id=$1', [other]);
  await db.exec('set role service_role');
  assert.equal(
    (await (await likes.GET(request(), context)).json()).count,
    0,
    'Deleting a reader also removes their like',
  );
  await db.query('insert into account_controls(user_id,suspended) values($1,true)', [reader]);
  assert.equal((await likes.PUT(request(reader, { liked: true }), context)).status, 403);
  const history = await (await revisions.GET(request(admin), context)).json();
  assert.ok(history.revisions.length >= 3);
  assert.equal((await revisions.GET(request(reader), context)).status, 403);
  const copyId = randomUUID();
  assert.equal(
    (await posts.POST(request(admin, { id: copyId, sourceId: id }, 'POST'))).status,
    201,
  );
  assert.equal((await publicPosts()).total, 1, 'Copies start private');
  const copyContext = { params: Promise.resolve({ id: copyId }) };
  let copy = (await (await post.GET(request(admin), copyContext)).json()).post;
  assert.equal(
    (
      await post.PUT(
        request(admin, { draft, version: copy.version, operation: 'publish' }),
        copyContext,
      )
    ).status,
    409,
    'Published slugs are unique',
  );
  response = await post.PUT(
    request(admin, { draft: changed, version: current.version, operation: 'unpublish' }),
    context,
  );
  current = (await response.json()).post;
  assert.equal((await publicPosts()).total, 0);
  response = await post.PUT(
    request(admin, { draft: changed, version: current.version, operation: 'trash' }),
    context,
  );
  current = (await response.json()).post;
  assert.equal(current.status, 'trashed');
  assert.equal(
    (await post.PUT(request(admin, { draft: changed, version: current.version }), context)).status,
    409,
  );
  response = await post.PUT(
    request(admin, { draft: changed, version: current.version, operation: 'restore' }),
    context,
  );
  current = (await response.json()).post;
  assert.equal(current.status, 'draft');
  const unsafe = {
    ...changed,
    content: { type: 'doc', content: [{ type: 'image', attrs: { src: 'javascript:alert(1)' } }] },
  };
  assert.equal(
    (await post.PUT(request(admin, { draft: unsafe, version: current.version }), context)).status,
    400,
  );
  const bytes = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#799166' } })
    .png()
    .toBuffer();
  const media = (actor: string, type: string, body: Buffer) =>
    new Request('http://localhost/image', {
      method: 'POST',
      headers: { authorization: `Bearer ${actor}`, 'Content-Type': type },
      body: new Uint8Array(body),
    });
  assert.equal((await images.POST(media(reader, 'image/png', bytes), context)).status, 403);
  assert.equal(
    (await images.POST(media(admin, 'image/svg+xml', Buffer.from('<svg/>')), context)).status,
    400,
  );
  assert.equal(
    (await images.POST(media(admin, 'image/png', Buffer.from('invalid')), context)).status,
    400,
  );
  response = await images.POST(media(admin, 'image/png', bytes), context);
  assert.equal(response.status, 201);
  assert.ok(uploaded);
  assert.match((await response.json()).url, /folio-blog\/.+\.webp$/);
  await db.exec('reset role;set role anon');
  await assert.rejects(db.query('select * from blog_posts'), /permission denied/);
  await assert.rejects(
    db.query('select blog_set_like($1,$2,true)', [reader, id]),
    /permission denied/,
  );
  await db.exec('reset role;set role authenticated');
  await assert.rejects(db.query('select * from blog_revisions'), /permission denied/);
  await db.exec('reset role;set role service_role');
  failDatabase = true;
  assert.equal((await posts.GET(request(admin))).status, 503);
  assert.equal((await publicPosts()).unavailable, true);
} finally {
  await db.close();
}

// Isolated server-route harness: real PostgreSQL policies and route handlers, mocked Supabase transport.
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { mock } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { NextRequest } from 'next/server';
import * as adminApi from '../../src/app/api/admin/route';
import * as supportApi from '../../src/app/api/support/route';
import * as documentExport from '../../src/app/api/documents/export/route';
import { sealResult } from '../../src/lib/server/result-artifact';
import { createSample } from '../../src/lib/sample';
import * as pdfApi from '../../src/app/api/pro/pdf/route';
import * as checkoutApi from '../../src/app/api/billing/checkout/route';
import * as portalApi from '../../src/app/api/billing/portal/route';
import * as workspacesApi from '../../src/app/api/workspaces/route';
import * as workspaceApi from '../../src/app/api/workspaces/[id]/route';
import * as filesApi from '../../src/app/api/account/files/route';
import * as fileApi from '../../src/app/api/account/files/[id]/route';
import * as accountBillingApi from '../../src/app/api/account/billing/route';
import { cloudTestSchema } from './cloud-schema';
import { proxy } from '../../src/proxy';
import { clearPlatformCache, getPlatform } from '../../src/lib/server/platform';
import { DEFAULT_CATALOG, DEFAULT_SETTINGS } from '../../src/lib/platform';
const admin = '00000000-0000-4000-8000-000000000001',
  customer = '00000000-0000-4000-8000-000000000002',
  other = '00000000-0000-4000-8000-000000000003';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://folio-tests.example.test';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-public';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;
const db = new PGlite();
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
  '007_admin_user_deletion.sql',
])
  await db.exec(
    await readFile(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8'),
  );
await db.query(
  "insert into auth.users(id,email) values ($1,'admin@example.test'),($2,'customer@example.test'),($3,'other@example.test')",
  [admin, customer, other],
);
await db.query('insert into super_admins(user_id) values ($1)', [admin]);
await db.exec('set role service_role');
const fetchOriginal = globalThis.fetch;
const cloudObjects = new Map<string, { size: number; content_type: string }>();
const recoveryObjects = new Set<string>();
let failCloudDelete = false;
let failAuthDelete = false;
let loseAuthDeleteResponse = false;
const ident = (s: string) => {
  assert.match(s, /^[a-z_]+$/);
  return `"${s}"`;
};
globalThis.fetch = async (input, init) => {
  const req = new Request(input, init),
    url = new URL(req.url);
  assert.equal(
    url.hostname,
    'folio-tests.example.test',
    'No real network calls are allowed in this fixture',
  );
  if (url.pathname === '/auth/v1/user') {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (![admin, customer, other].includes(token || ''))
      return Response.json({ message: 'Invalid JWT' }, { status: 401 });
    const user = (
      await db.query<{ email: string }>('select email from auth.users where id=$1', [token])
    ).rows[0];
    if (!user) return Response.json({ message: 'User not found' }, { status: 401 });
    return Response.json({
      id: token,
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: { role: 'super_admin' },
      aud: 'authenticated',
      role: 'authenticated',
    });
  }
  assert.equal(req.headers.get('apikey'), 'test-service');
  if (url.pathname.startsWith('/auth/v1/admin/users/') && req.method === 'DELETE') {
    if (failAuthDelete) return Response.json({ message: 'Auth unavailable' }, { status: 503 });
    const id = url.pathname.split('/').pop()!;
    const exists = await db.query('select id from auth.users where id=$1', [id]);
    if (!exists.rows.length) return Response.json({ code: 'user_not_found' }, { status: 404 });
    const ownedObjects = await db.query('select id from storage.objects where owner_id=$1', [id]);
    assert.equal(ownedObjects.rows.length, 0, 'Auth deletion must follow storage cleanup');
    await db.exec('reset role');
    try {
      await db.query('delete from auth.users where id=$1', [id]);
    } finally {
      await db.exec('set role service_role');
    }
    if (loseAuthDeleteResponse)
      return Response.json({ message: 'Response lost after commit' }, { status: 503 });
    return Response.json({
      id,
      aud: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    });
  }
  if (url.pathname.startsWith('/storage/v1/object/info/folio-documents/')) {
    const path = url.pathname.split('/folio-documents/')[1];
    const object = cloudObjects.get(path);
    return object
      ? Response.json({ ...object, name: path, bucket_id: 'folio-documents' })
      : Response.json({ message: 'Not found' }, { status: 404 });
  }
  if (url.pathname.startsWith('/storage/v1/object/upload/sign/folio-documents/')) {
    return Response.json({
      url:
        '/object/upload/sign/folio-documents/' +
        url.pathname.split('/folio-documents/')[1] +
        '?token=fixture',
    });
  }
  if (url.pathname.startsWith('/storage/v1/object/sign/folio-documents/')) {
    return Response.json({
      signedURL:
        '/object/sign/folio-documents/' +
        url.pathname.split('/folio-documents/')[1] +
        '?token=fixture',
    });
  }
  if (
    ['/storage/v1/object/folio-documents', '/storage/v1/object/folio-recovery'].includes(
      url.pathname,
    ) &&
    req.method === 'DELETE'
  ) {
    if (failCloudDelete) return Response.json({ message: 'Storage unavailable' }, { status: 503 });
    const body = await req.json();
    const bucket = url.pathname.split('/').pop()!;
    for (const path of body.prefixes) {
      if (bucket === 'folio-documents') cloudObjects.delete(path);
      else recoveryObjects.delete(path);
    }
    await db.query('delete from storage.objects where bucket_id=$1 and name=any($2::text[])', [
      bucket,
      body.prefixes,
    ]);
    return Response.json([]);
  }
  try {
    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      const name = url.pathname.split('/').pop()!;
      const body = await req.json();
      const names = Object.keys(body);
      const args = names.map((k, i) => `${ident(k)} => $${i + 1}`).join(',');
      const row = await db.query<{ value: unknown }>(
        `select public.${ident(name)}(${args}) as value`,
        Object.values(body),
      );
      return Response.json(row.rows[0].value);
    }
    const table = url.pathname.split('/').pop()!;
    assert.ok(
      [
        'account_controls',
        'super_admins',
        'access_grants',
        'billing_customers',
        'billing_subscriptions',
        'platform_settings',
        'pricing_versions',
        'support_tickets',
        'support_messages',
        'admin_audit',
        'cloud_documents',
        'user_deletions',
      ].includes(table),
    );
    const params: unknown[] = [];
    const conditions: string[] = [];
    for (const [key, value] of url.searchParams) {
      if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key)) continue;
      const pos = value.indexOf('.');
      const op = value.slice(0, pos),
        v = value.slice(pos + 1);
      assert.ok(['eq', 'is', 'gt', 'neq'].includes(op));
      conditions.push(
        op === 'is' && v === 'null'
          ? `${ident(key)} is null`
          : `${ident(key)} ${op === 'gt' ? '>' : op === 'neq' ? '<>' : '='} $${params.push(v)}`,
      );
    }
    const where = conditions.length ? ` where ${conditions.join(' and ')}` : '';
    if (req.method === 'GET') {
      const fields = (url.searchParams.get('select') || '*')
        .split(',')
        .map((s) => (s === '*' ? s : ident(s)))
        .join(',');
      const count = (
        await db.query<{ n: number }>(
          `select count(*)::int as n from ${ident(table)}${where}`,
          params,
        )
      ).rows[0].n;
      const order = (url.searchParams.get('order') || '')
        .split(',')
        .filter(Boolean)
        .map((s) => {
          const [col, dir] = s.split('.');
          return `${ident(col)} ${dir === 'desc' ? 'desc' : 'asc'}`;
        });
      const limit = Number(url.searchParams.get('limit') || 1000),
        offset = Number(url.searchParams.get('offset') || 0);
      assert.ok(Number.isInteger(limit) && Number.isInteger(offset));
      const result = await db.query(
        `select ${fields} from ${ident(table)}${where}${order.length ? ' order by ' + order.join(',') : ''} limit ${limit} offset ${offset}`,
        params,
      );
      if (req.headers.get('accept')?.includes('vnd.pgrst.object')) {
        if (!result.rows.length)
          return Response.json(
            { code: 'PGRST116', details: 'The result contains 0 rows' },
            { status: 406 },
          );
        return Response.json(result.rows[0]);
      }
      return Response.json(result.rows, {
        headers: { 'content-range': `0-${Math.max(0, result.rows.length - 1)}/${count}` },
      });
    }
    if (req.method === 'DELETE') {
      await db.query(`delete from ${ident(table)}${where}`, params);
      return new Response(null, { status: 204 });
    }
    const body = await req.json();
    const keys = Object.keys(body);
    let result;
    if (req.method === 'POST') {
      const vals = Object.values(body);
      result = await db.query(
        `insert into ${ident(table)}(${keys.map(ident).join(',')}) values (${keys.map((_, i) => '$' + (i + 1)).join(',')})${req.headers.get('prefer')?.includes('resolution=ignore-duplicates') ? ' on conflict do nothing' : ''} returning *`,
        vals,
      );
    } else {
      assert.equal(req.method, 'PATCH');
      const assignments = keys.map((k) => `${ident(k)}=$${params.push(body[k])}`).join(',');
      result = await db.query(
        `update ${ident(table)} set ${assignments}${where} returning *`,
        params,
      );
    }
    return req.headers.get('prefer')?.includes('return=representation')
      ? Response.json(
          req.headers.get('accept')?.includes('vnd.pgrst.object') ? result.rows[0] : result.rows,
        )
      : new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : String(error), code: 'P0001' },
      { status: 400 },
    );
  }
};
const request = (route: string, actor?: string, body?: unknown) =>
  new Request(`http://localhost${route}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(actor ? { Authorization: `Bearer ${actor}` } : {}),
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
try {
  // Real anonymous ownership, expiry, idempotency, revision conflicts, and claiming an account.
  const workspaceId = '00000000-0000-4000-8000-000000000090';
  const workspaceContext = { params: Promise.resolve({ id: workspaceId }) };
  let cookie = '';
  const workspaceRequest = (
    body?: unknown,
    actor?: string,
    session = cookie,
    method = body ? 'PATCH' : 'GET',
  ) =>
    new Request('http://localhost/api/workspaces/' + workspaceId, {
      method,
      headers: {
        'x-folio-workspace': '1',
        'content-type': 'application/json',
        ...(session ? { cookie: session } : {}),
        ...(actor ? { authorization: 'Bearer ' + actor } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  const creation = await workspacesApi.POST(
    workspaceRequest({ id: workspaceId, name: 'Guest.pdf', size: 123 }, undefined, '', 'POST'),
  );
  assert.equal(creation.status, 201, await creation.clone().text());
  cookie = creation.headers.get('set-cookie')!.split(';')[0];
  assert.match(creation.headers.get('set-cookie')!, /HttpOnly/i);
  assert.match(creation.headers.get('set-cookie')!, /SameSite=lax/i);
  const created = await creation.json();
  assert.equal(created.id, workspaceId);
  const path = new URL(created.uploadUrl).pathname.split('/folio-documents/')[1];
  assert.equal(
    (await workspaceApi.GET(workspaceRequest(undefined, undefined, ''), workspaceContext)).status,
    404,
  );
  assert.equal((await workspaceApi.GET(workspaceRequest(), workspaceContext)).status, 409);
  cloudObjects.set(path, { size: 123, content_type: 'application/pdf' });
  assert.equal(
    (await workspaceApi.PATCH(workspaceRequest({ action: 'finish' }), workspaceContext)).status,
    200,
  );
  const snapshot = {
    state: {
      pages: [{ id: 'page', sourceIndex: 0, width: 595, height: 842, rotation: 0 }],
      annotations: [],
      formValues: {},
    },
    inspection: null,
    page: 0,
    mode: 'text',
    flatten: false,
  };
  const saveBody = {
    action: 'save',
    name: 'Guest.pdf',
    revision: 0,
    writeId: '00000000-0000-4000-8000-000000000080',
    snapshot,
  };
  const saved = await workspaceApi.PATCH(workspaceRequest(saveBody), workspaceContext);
  assert.equal(saved.status, 200, await saved.clone().text());
  assert.equal((await saved.json()).revision, 1);
  const repeated = await workspaceApi.PATCH(workspaceRequest(saveBody), workspaceContext);
  assert.equal(repeated.status, 200);
  assert.equal(
    (await repeated.json()).revision,
    1,
    'A lost response does not save the same edit twice',
  );
  assert.equal(
    (
      await workspaceApi.PATCH(
        workspaceRequest({ ...saveBody, writeId: '00000000-0000-4000-8000-000000000081' }),
        workspaceContext,
      )
    ).status,
    409,
  );
  const restored = await (await workspaceApi.GET(workspaceRequest(), workspaceContext)).json();
  assert.deepEqual(restored.snapshot, snapshot);
  assert.ok(restored.sourceUrl.includes('token=fixture'));
  assert.equal(
    (await workspaceApi.GET(workspaceRequest(undefined, customer, ''), workspaceContext)).status,
    404,
  );
  const crossSite = workspaceRequest();
  crossSite.headers.set('origin', 'https://another.example');
  assert.equal((await workspaceApi.GET(crossSite, workspaceContext)).status, 403);
  const localOrigins: Record<string, string>[] = [
    { host: 'localhost:3000', origin: 'http://localhost:3000' },
    { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' },
    { host: '192.168.1.10:3000', origin: 'http://192.168.1.10:3000' },
    {
      host: 'internal:3000',
      origin: 'https://folio.example',
      'sec-fetch-site': 'same-origin',
    },
  ];
  for (const headers of localOrigins) {
    const local = new Request('http://0.0.0.0:3000/api/workspaces/' + workspaceId, {
      headers: { ...headers, cookie, 'x-folio-workspace': '1' },
    });
    assert.equal((await workspaceApi.GET(local, workspaceContext)).status, 200);
  }
  for (const site of ['cross-site', 'same-site', 'none']) {
    const hostile = workspaceRequest();
    hostile.headers.set('sec-fetch-site', site);
    assert.equal((await workspaceApi.GET(hostile, workspaceContext)).status, 403);
  }
  const forgedProxy = workspaceRequest();
  forgedProxy.headers.set('origin', 'https://another.example');
  forgedProxy.headers.set('x-forwarded-host', 'another.example');
  forgedProxy.headers.set('x-forwarded-proto', 'https');
  assert.equal((await workspaceApi.GET(forgedProxy, workspaceContext)).status, 403);
  const noMarker = workspaceRequest();
  noMarker.headers.delete('x-folio-workspace');
  noMarker.headers.set('sec-fetch-site', 'same-origin');
  assert.equal((await workspaceApi.GET(noMarker, workspaceContext)).status, 403);
  assert.equal(
    (await workspaceApi.PATCH(workspaceRequest({ action: 'claim' }, customer), workspaceContext))
      .status,
    200,
  );
  assert.equal(
    (await workspaceApi.GET(workspaceRequest(), workspaceContext)).status,
    404,
    'Guest cookie loses access after claim',
  );
  const claimed = await (
    await workspaceApi.GET(workspaceRequest(undefined, customer, ''), workspaceContext)
  ).json();
  assert.equal(claimed.expiresAt, null);
  assert.deepEqual(claimed.snapshot, snapshot);
  await db.query('delete from cloud_documents where id=$1', [workspaceId]);
  cloudObjects.delete(path);
  const expiredCreation = await workspacesApi.POST(
    workspaceRequest({ id: workspaceId, name: 'Expired.pdf', size: 12 }, undefined, cookie, 'POST'),
  );
  assert.equal(expiredCreation.status, 201);
  await db.query("update cloud_documents set expires_at=now()-interval '1 second' where id=$1", [
    workspaceId,
  ]);
  assert.equal((await workspaceApi.GET(workspaceRequest(), workspaceContext)).status, 404);
  assert.equal(
    (await workspaceApi.PATCH(workspaceRequest({ action: 'claim' }, customer), workspaceContext))
      .status,
    404,
  );
  await db.query('delete from cloud_documents where id=$1', [workspaceId]);
  assert.equal((await filesApi.GET(request('/api/account/files'))).status, 401);
  assert.equal((await accountBillingApi.GET(request('/api/account/billing'))).status, 401);
  const reserve = await filesApi.POST(
    request('/api/account/files', customer, { name: 'Private.pdf', size: 80 }),
  );
  assert.equal(reserve.status, 201, await reserve.clone().text());
  const reserved = await reserve.json();
  assert.ok(reserved.path.startsWith(customer + '/'));
  const fileContext = { params: Promise.resolve({ id: reserved.id }) };
  const fileRequest = (actor: string, method = 'GET', body?: unknown) =>
    new Request(`http://localhost/api/account/files/${reserved.id}`, {
      method,
      headers: { Authorization: `Bearer ${actor}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  assert.equal((await fileApi.GET(fileRequest(other), fileContext)).status, 404);
  assert.equal((await fileApi.GET(fileRequest(customer), fileContext)).status, 409);
  assert.equal(
    (
      await fileApi.PATCH(
        fileRequest(other, 'PATCH', { action: 'rename', name: 'Stolen.pdf' }),
        fileContext,
      )
    ).status,
    404,
  );
  assert.equal((await fileApi.DELETE(fileRequest(other, 'DELETE'), fileContext)).status, 404);
  cloudObjects.set(reserved.path, { size: 100, content_type: 'application/pdf' });
  assert.equal(
    (await fileApi.PATCH(fileRequest(customer, 'PATCH', { action: 'finish' }), fileContext)).status,
    409,
  );
  cloudObjects.set(reserved.path, { size: 80, content_type: 'application/pdf' });
  assert.equal(
    (await fileApi.PATCH(fileRequest(customer, 'PATCH', { action: 'finish' }), fileContext)).status,
    200,
  );
  const ownFiles = await (await filesApi.GET(request('/api/account/files', customer))).json();
  assert.equal(ownFiles.files.length, 1);
  assert.equal(ownFiles.files[0].status, 'ready');
  assert.equal('user_id' in ownFiles.files[0], false);
  const others = await (
    await filesApi.GET(request('/api/account/files?user_id=' + customer, other))
  ).json();
  assert.equal(others.files.length, 0);
  assert.equal(
    (
      await fileApi.PATCH(
        fileRequest(customer, 'PATCH', { action: 'rename', name: 'My revised.pdf' }),
        fileContext,
      )
    ).status,
    200,
  );
  assert.equal(
    (await (await fileApi.GET(fileRequest(customer), fileContext)).json()).name,
    'My revised.pdf',
  );
  failCloudDelete = true;
  assert.equal((await fileApi.DELETE(fileRequest(customer, 'DELETE'), fileContext)).status, 503);
  assert.equal((await fileApi.GET(fileRequest(customer), fileContext)).status, 409);
  assert.equal(cloudObjects.has(reserved.path), true);
  failCloudDelete = false;
  assert.equal((await fileApi.DELETE(fileRequest(customer, 'DELETE'), fileContext)).status, 200);
  assert.equal(cloudObjects.has(reserved.path), false);
  assert.equal((await fileApi.GET(fileRequest(customer), fileContext)).status, 404);
  assert.equal((await adminApi.GET(request('/api/admin'))).status, 401);
  assert.equal((await adminApi.GET(request('/api/admin', customer))).status, 403);
  assert.equal(
    (
      await adminApi.POST(
        request('/api/admin', customer, {
          action: 'settings',
          settings: { ...DEFAULT_SETTINGS, maintenance: true },
        }),
      )
    ).status,
    403,
  );
  for (const view of [
    'overview',
    'users',
    'subscriptions',
    'pricing',
    'support',
    'settings',
    'audit',
  ]) {
    const response = await adminApi.GET(request(`/api/admin?view=${view}`, admin));
    assert.equal(response.status, 200, await response.clone().text());
  }
  assert.equal((await pdfApi.POST(request('/api/pro/pdf', customer, {}))).status, 402);
  process.env.DOCUMENT_RESULT_KEY = 'a'.repeat(64);
  const convertedPdf = await createSample();
  const artifact = sealResult(convertedPdf, {
    tool: 'translate-pdf',
    filename: 'translated.pdf',
    pages: 3,
  }).artifact;
  assert.equal(
    (await documentExport.POST(request('/api/documents/export', customer, { artifact }))).status,
    402,
  );
  const grant = await adminApi.POST(
    request('/api/admin', admin, {
      action: 'user',
      userId: customer,
      operation: 'grant',
      reason: 'Goodwill access',
      days: 2,
    }),
  );
  assert.equal(grant.status, 200, await grant.clone().text());
  assert.equal((await pdfApi.POST(request('/api/pro/pdf', customer, {}))).status, 400); // Permission granted; invalid file still rejected.
  const exported = await documentExport.POST(
    request('/api/documents/export', customer, { artifact }),
  );
  assert.equal(exported.status, 200);
  assert.deepEqual(Buffer.from(await exported.arrayBuffer()), Buffer.from(convertedPdf));
  assert.equal(
    (await documentExport.POST(request('/api/documents/export', other, { artifact }))).status,
    402,
  );
  const inquiry = await supportApi.POST(
    request('/api/support', customer, {
      name: 'Customer',
      email: 'spoofed@example.test',
      subject: 'Need help',
      message: 'Please help with this document',
    }),
  );
  assert.equal(inquiry.status, 201, await inquiry.clone().text());
  const { id } = await inquiry.json();
  const ticket = (
    await db.query<{ email: string }>('select email from support_tickets where id=$1', [id])
  ).rows[0];
  assert.equal(ticket.email, 'customer@example.test');
  assert.equal((await supportApi.GET(request(`/api/support?ticket=${id}`, other))).status, 404);
  const impersonation = await supportApi.PATCH(
    new Request('http://localhost/api/support', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${other}` },
      body: JSON.stringify({ ticket: id, message: 'Trying to read this' }),
    }),
  );
  assert.equal(impersonation.status, 403);
  assert.equal(
    (
      await adminApi.POST(
        request('/api/admin', admin, {
          action: 'support',
          ticketId: id,
          message: 'We can help.',
          status: 'pending',
          priority: 'high',
        }),
      )
    ).status,
    200,
  );
  const conversation = await (
    await supportApi.GET(request(`/api/support?ticket=${id}`, customer))
  ).json();
  assert.equal(conversation.messages[0].staff, true);
  assert.equal(conversation.messages[0].message, 'We can help.');
  assert.equal(
    (
      await adminApi.POST(
        request('/api/admin', admin, {
          action: 'user',
          userId: customer,
          operation: 'suspend',
          reason: 'Account review',
          days: 30,
        }),
      )
    ).status,
    200,
  );
  assert.equal((await pdfApi.POST(request('/api/pro/pdf', customer, {}))).status, 403);
  assert.equal(
    (await documentExport.POST(request('/api/documents/export', customer, { artifact }))).status,
    403,
  );
  assert.equal(
    (await checkoutApi.POST(request('/api/billing/checkout', customer, {}))).status,
    403,
  );
  assert.equal((await supportApi.GET(request('/api/support', customer))).status, 200);
  assert.equal((await portalApi.POST(request('/api/billing/portal', customer, {}))).status, 404); // No customer mapping yet; suspension does not block the billing lookup.
  const settings = {
    ...DEFAULT_SETTINGS,
    maintenance: true,
    purchasesEnabled: false,
    announcement: 'Scheduled care',
  };
  assert.equal(
    (await adminApi.POST(request('/api/admin', admin, { action: 'settings', settings }))).status,
    200,
  );
  assert.equal((await getPlatform(true)).settings.maintenance, true);
  for (const route of [
    '/',
    '/pricing',
    '/edit-pdf-text',
    '/api/pro/preview',
    '/api/billing/checkout',
  ]) {
    const response = await proxy(new NextRequest(`http://localhost${route}`));
    assert.equal(response.status, 503, route);
    assert.equal(response.headers.get('retry-after'), '300');
  }
  for (const route of [
    '/admin',
    '/account',
    '/dashboard?view=billing',
    '/auth/callback',
    '/support',
    '/api/admin',
    '/api/account/access',
    '/api/billing/portal',
    '/api/billing/webhook',
    '/api/support',
  ])
    assert.equal((await proxy(new NextRequest(`http://localhost${route}`))).status, 200, route);
  assert.equal(
    (
      await adminApi.POST(
        request('/api/admin', admin, { action: 'settings', settings: DEFAULT_SETTINGS }),
      )
    ).status,
    200,
  );
  clearPlatformCache();
  assert.equal((await proxy(new NextRequest('http://localhost/'))).status, 200);
  // Mock only the Stripe SDK transport boundary; publishing and synchronization use real handlers/SQL.
  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_fixture';
  process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_initial';
  process.env.STRIPE_PRO_TRIAL_PRICE_ID = 'price_intro_initial';
  const resources = (
    Stripe as unknown as {
      resources: Record<string, { prototype: Record<string, (...args: unknown[]) => unknown> }>;
    }
  ).resources;
  const stripeCalls: { kind: string; key: string; body: Record<string, unknown> }[] = [];
  for (const [resource, kind] of [
    ['Products', 'product'],
    ['Prices', 'price'],
  ])
    mock.method(
      resources[resource].prototype,
      'create',
      async (body: Record<string, unknown>, options: { idempotencyKey: string }) => {
        stripeCalls.push({ kind, key: options.idempotencyKey, body });
        return { id: `${kind}_${stripeCalls.length}` };
      },
    );
  const version = '00000000-0000-4000-8000-000000000010';
  const pricing = {
    name: 'Folio Pro Plus',
    currency: 'usd',
    monthlyAmount: 3000,
    trialAmount: 200,
    trialDays: 10,
    trialEnabled: true,
  };
  const publication = {
    action: 'pricing',
    requestId: version,
    expectedVersion: 'initial',
    pricing,
    reason: 'New customer pricing',
  };
  const published = await adminApi.POST(request('/api/admin', admin, publication));
  assert.equal(published.status, 200, await published.clone().text());
  assert.equal(stripeCalls.length, 4);
  assert.equal(stripeCalls[1].body.unit_amount, 3000);
  assert.equal(stripeCalls[3].body.unit_amount, 200);
  assert.equal((await getPlatform(true)).catalog.version, version);
  assert.equal(
    (
      await db.query<{ monthly_price_id: string }>(
        "select monthly_price_id from pricing_versions where id='initial'",
      )
    ).rows[0].monthly_price_id,
    'price_initial',
  );
  assert.equal((await adminApi.POST(request('/api/admin', admin, publication))).status, 200);
  assert.equal(stripeCalls.length, 4);
  assert.equal(
    (
      await adminApi.POST(
        request('/api/admin', admin, {
          ...publication,
          pricing: { ...pricing, monthlyAmount: 4000 },
        }),
      )
    ).status,
    409,
  );
  // Simulate a committed publication whose final audit acknowledgment failed: retry must recover.
  await db.query(
    "update admin_audit set detail=jsonb_set(detail,'{completed}','false') where id=$1",
    [version],
  );
  assert.equal((await adminApi.POST(request('/api/admin', admin, publication))).status, 200);
  assert.equal(stripeCalls.length, 4);
  assert.equal(
    (
      await adminApi.POST(
        request('/api/admin', admin, {
          ...publication,
          requestId: '00000000-0000-4000-8000-000000000011',
        }),
      )
    ).status,
    409,
  );
  assert.equal(
    (
      await checkoutApi.POST(
        request('/api/billing/checkout', other, { plan: 'month', pricingVersion: 'initial' }),
      )
    ).status,
    409,
  );
  const until = Math.floor(Date.now() / 1000) + 86400;
  const subscription = {
    id: 'sub_customer',
    customer: 'cus_customer',
    status: 'active',
    cancel_at_period_end: false,
    items: {
      data: [{ id: 'si_customer', price: { id: 'price_initial' }, current_period_end: until }],
    },
    latest_invoice: {
      status: 'paid',
      amount_paid: 2500,
      lines: {
        data: [
          {
            amount: 2500,
            period: { end: until },
            parent: { subscription_item_details: { subscription_item: 'si_customer' } },
          },
        ],
      },
    },
  };
  await db.query(
    "insert into billing_customers(user_id,stripe_customer_id) values ($1,'cus_customer')",
    [customer],
  );
  await db.query(
    "insert into billing_subscriptions(user_id,stripe_subscription_id,price_id,status) values ($1,'sub_customer','price_initial','active')",
    [customer],
  );
  mock.method(resources.Subscriptions.prototype, 'retrieve', async () => subscription);
  mock.method(
    resources.Subscriptions.prototype,
    'update',
    async (id: string, values: { cancel_at_period_end: boolean }) => {
      assert.equal(id, 'sub_customer');
      subscription.cancel_at_period_end = values.cancel_at_period_end;
      return subscription;
    },
  );
  mock.method(resources.Subscriptions.prototype, 'cancel', async () => {
    subscription.status = 'canceled';
    return subscription;
  });
  for (const [i, operation] of ['cancel_end', 'resume', 'cancel_now'].entries()) {
    const response = await adminApi.POST(
      request('/api/admin', admin, {
        action: 'subscription',
        requestId: `00000000-0000-4000-8000-00000000002${i}`,
        subscriptionId: 'sub_customer',
        operation,
        reason: 'Customer request',
      }),
    );
    assert.equal(response.status, 200, await response.clone().text());
    const record = (
      await db.query<{ status: string; cancel_at_period_end: boolean }>(
        "select status,cancel_at_period_end from billing_subscriptions where stripe_subscription_id='sub_customer'",
      )
    ).rows[0];
    if (operation === 'cancel_now') assert.equal(record.status, 'canceled');
    else assert.equal(record.cancel_at_period_end, operation === 'cancel_end');
  }
  assert.equal(
    (
      await db.query<{ monthly_amount: number }>(
        "select monthly_amount from pricing_versions where id='initial'",
      )
    ).rows[0].monthly_amount,
    DEFAULT_CATALOG.monthlyAmount,
  );
  // Activation restores access; deletion is a separate, confirmed operation.
  const activate = {
    action: 'user',
    userId: customer,
    operation: 'restore',
    reason: 'Account reviewed',
  };
  assert.equal((await adminApi.POST(request('/api/admin', admin, activate))).status, 200);
  assert.equal((await filesApi.GET(request('/api/account/files', customer))).status, 200);
  const deletion = {
    action: 'delete_user',
    userId: customer,
    confirmation: 'DELETE',
    reason: 'Customer requested deletion',
  };
  assert.equal((await adminApi.POST(request('/api/admin', undefined, deletion))).status, 401);
  assert.equal((await adminApi.POST(request('/api/admin', other, deletion))).status, 403);
  assert.equal(
    (await adminApi.POST(request('/api/admin', admin, { ...deletion, confirmation: 'yes' })))
      .status,
    400,
  );
  assert.equal(
    (await adminApi.POST(request('/api/admin', admin, { ...deletion, userId: admin }))).status,
    400,
  );
  await db.query('insert into super_admins(user_id) values ($1)', [other]);
  assert.equal(
    (await adminApi.POST(request('/api/admin', admin, { ...deletion, userId: other }))).status,
    400,
  );
  await db.query('delete from super_admins where user_id=$1', [other]);
  const absent = '00000000-0000-4000-8000-000000000099';
  assert.equal(
    (await adminApi.POST(request('/api/admin', admin, { ...deletion, userId: absent }))).status,
    404,
  );
  const ready = await (await adminApi.GET(request('/api/admin?view=users', admin))).json();
  assert.equal(ready.userDeletionReady, true);
  await db.query(
    "update billing_customers set checkout_lock_until=now()+interval '1 minute' where user_id=$1",
    [customer],
  );
  assert.equal((await adminApi.POST(request('/api/admin', admin, deletion))).status, 409);
  assert.equal((await db.query('select * from user_deletions')).rows.length, 0);
  await db.query('update billing_customers set checkout_lock_until=null where user_id=$1', [
    customer,
  ]);

  // Owned, claimed-guest, orphaned and recovery objects must all be removed.
  const ownedPath = `${customer}/owned.pdf`,
    claimedPath = 'guest/claimed/document.pdf';
  const orphanPath = `${customer}/orphan.pdf`,
    otherPath = `${other}/keep.pdf`;
  for (const [owner, objectPath] of [
    [customer, ownedPath],
    [customer, claimedPath],
    [other, otherPath],
  ]) {
    await db.query(
      "insert into cloud_documents(user_id,name,object_path,size,status) values ($1,'Saved.pdf',$2,80,'ready')",
      [owner, objectPath],
    );
  }
  for (const objectPath of [ownedPath, claimedPath, orphanPath, otherPath]) {
    cloudObjects.set(objectPath, { size: 80, content_type: 'application/pdf' });
    await db.query(
      "insert into storage.objects(bucket_id,name,owner_id) values ('folio-documents',$1,$2)",
      [objectPath, objectPath === claimedPath ? null : objectPath.split('/')[0]],
    );
  }
  for (const owner of [customer, other]) {
    const objectPath = `${owner}/pro-text.json`;
    recoveryObjects.add(objectPath);
    await db.query(
      "insert into storage.objects(bucket_id,name,owner_id) values ('folio-recovery',$1,$2)",
      [objectPath, owner],
    );
  }
  await db.query(
    "insert into support_tickets(email,name,subject,message) values ('CUSTOMER@example.test','Guest','Old inquiry','Private text')",
  );
  await db.query(
    "insert into support_tickets(user_id,email,name,subject,message) values ($1,'other@example.test','Other','Keep inquiry','Keep text')",
    [other],
  );
  // Former administrator references must not block removal or erase others' grants.
  await db.query(
    "insert into access_grants(user_id,until_at,reason,granted_by) values ($1,now()+interval '1 day','Keep grant',$2)",
    [other, customer],
  );
  await db.query(
    "insert into admin_audit(actor_id,action,target) values ($1,'past.action','past-target')",
    [customer],
  );

  delete process.env.STRIPE_SECRET_KEY;
  let response = await adminApi.POST(request('/api/admin', admin, deletion));
  assert.equal(response.status, 503);
  assert.match(await response.text(), /Connect Stripe/);
  assert.equal(cloudObjects.has(ownedPath), true);
  assert.equal((await filesApi.GET(request('/api/account/files', customer))).status, 403);
  assert.equal((await adminApi.POST(request('/api/admin', admin, activate))).status, 409);
  const pending = await (await adminApi.GET(request('/api/admin?view=users', admin))).json();
  assert.equal(
    pending.users.rows.find((row: { id: string }) => row.id === customer).deletion_pending,
    true,
  );
  for (const query of [
    'update billing_customers set checkout_lock_until=now() where user_id=$1',
    "insert into cloud_documents(user_id,name,object_path,size) values ($1,'Later.pdf','late/upload.pdf',80)",
    'update access_grants set until_at=now() where user_id=$1',
  ])
    await assert.rejects(db.query(query, [customer]), /deletion_in_progress/);

  process.env.STRIPE_SECRET_KEY = 'sk_test_fixture';
  let failBillingDelete = true,
    stripeDeleted = false,
    stripeDeleteCount = 0;
  mock.method(resources.Customers.prototype, 'retrieve', async (id: string) => {
    assert.equal(id, 'cus_customer');
    return { id, deleted: stripeDeleted };
  });
  mock.method(resources.Customers.prototype, 'del', async (id: string) => {
    assert.equal(id, 'cus_customer');
    if (failBillingDelete) throw new Error('Stripe unavailable');
    stripeDeleteCount++;
    stripeDeleted = true;
    return { id, deleted: true };
  });
  response = await adminApi.POST(request('/api/admin', admin, deletion));
  assert.equal(response.status, 503);
  assert.match(await response.text(), /Billing cleanup/);
  assert.equal(cloudObjects.has(ownedPath), true);
  failBillingDelete = false;
  failCloudDelete = true;
  response = await adminApi.POST(request('/api/admin', admin, deletion));
  assert.equal(response.status, 503);
  assert.match(await response.text(), /files could not be deleted/);
  assert.equal(stripeDeleteCount, 1);
  assert.equal(cloudObjects.has(ownedPath), true);
  assert.equal(
    (await db.query('select id from auth.users where id=$1', [customer])).rows.length,
    1,
  );
  failCloudDelete = false;
  failAuthDelete = true;
  response = await adminApi.POST(request('/api/admin', admin, deletion));
  assert.equal(response.status, 503);
  assert.match(await response.text(), /Account deletion could not finish/);
  assert.equal(cloudObjects.has(ownedPath), false);
  assert.equal(cloudObjects.has(claimedPath), false);
  assert.equal(cloudObjects.has(orphanPath), false);
  assert.equal(recoveryObjects.has(`${customer}/pro-text.json`), false);
  assert.equal(
    (await db.query('select id from cloud_documents where user_id=$1', [customer])).rows.length,
    2,
    'Keep metadata until Auth cleanup succeeds',
  );
  failAuthDelete = false;
  loseAuthDeleteResponse = true;
  response = await adminApi.POST(request('/api/admin', admin, deletion));
  assert.equal(response.status, 200, await response.clone().text());
  loseAuthDeleteResponse = false;
  assert.deepEqual(await response.json(), { saved: true, deleted: true });
  assert.equal(
    (await adminApi.POST(request('/api/admin', admin, deletion))).status,
    200,
    'Completed deletion is safe to retry',
  );
  assert.equal(stripeDeleteCount, 1);
  assert.equal(
    (await db.query('select id from auth.users where id=$1', [customer])).rows.length,
    0,
  );
  for (const table of [
    'cloud_documents',
    'billing_customers',
    'billing_subscriptions',
    'account_controls',
    'access_grants',
    'pro_usage',
  ])
    assert.equal(
      (await db.query(`select user_id from ${ident(table)} where user_id=$1`, [customer])).rows
        .length,
      0,
      table,
    );
  assert.equal(
    (await db.query("select id from support_tickets where lower(email)='customer@example.test'"))
      .rows.length,
    0,
  );
  assert.equal(
    (
      await db.query('select id from support_messages where author_id=$1 or ticket_id=$2', [
        customer,
        id,
      ])
    ).rows.length,
    0,
  );
  const audit = await db.query<{ action: string }>(
    'select action from admin_audit where actor_id=$1::uuid or target=$1::text',
    [customer],
  );
  assert.deepEqual(
    audit.rows.map((row) => row.action),
    ['user.delete'],
  );
  assert.equal(
    (await db.query("select id from admin_audit where target=$1 or target='sub_customer'", [id]))
      .rows.length,
    0,
  );
  assert.equal(
    (
      await db.query<{ status: string }>('select status from user_deletions where user_id=$1', [
        customer,
      ])
    ).rows[0].status,
    'deleted',
  );
  assert.equal(cloudObjects.has(otherPath), true);
  assert.equal(recoveryObjects.has(`${other}/pro-text.json`), true);
  assert.equal(
    (await db.query('select id from support_tickets where user_id=$1', [other])).rows.length,
    1,
  );
  assert.equal(
    (
      await db.query<{ granted_by: string | null }>(
        'select granted_by from access_grants where user_id=$1',
        [other],
      )
    ).rows[0].granted_by,
    null,
  );
  assert.equal((await filesApi.GET(request('/api/account/files', customer))).status, 401);
  assert.equal((await filesApi.GET(request('/api/account/files', other))).status, 200);

  // Even a still-valid JWT cannot recreate deleted recovery data or run admin RPCs.
  await db.exec('reset role; set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [customer]);
  await assert.rejects(
    db.query("insert into storage.objects(bucket_id,name) values ('folio-recovery',$1)", [
      `${customer}/pro-text.json`,
    ]),
    /row-level security/,
  );
  for (const query of [
    "select public.begin_user_deletion($1,$2,'Reason')",
    'select public.user_deletion_objects($1,$2)',
    'select public.finish_user_deletion($1,$2)',
  ])
    await assert.rejects(db.query(query, [admin, other]), /permission denied/);
  await db.exec('reset role; set role service_role');
  // A user without any Stripe customer can also be deleted without Stripe configured.
  delete process.env.STRIPE_SECRET_KEY;
  response = await adminApi.POST(request('/api/admin', admin, { ...deletion, userId: other }));
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal(cloudObjects.has(otherPath), false);
  assert.equal(recoveryObjects.has(`${other}/pro-text.json`), false);
  assert.equal((await adminApi.GET(request('/api/admin', admin))).status, 200);
  console.log(
    'Server routes verified: admin authorization, activation, complete user deletion, failure recovery, storage isolation, billing cleanup, support and maintenance.',
  );
} finally {
  mock.restoreAll();
  globalThis.fetch = fetchOriginal;
  await db.close();
}

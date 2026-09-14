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
let failCloudDelete = false;
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
  if (url.pathname === '/storage/v1/object/folio-documents' && req.method === 'DELETE') {
    if (failCloudDelete) return Response.json({ message: 'Storage unavailable' }, { status: 503 });
    const body = await req.json();
    for (const path of body.prefixes) cloudObjects.delete(path);
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
  console.log(
    'Server routes verified: admin authorization, grants, suspension, support ownership, maintenance recovery.',
  );
} finally {
  mock.restoreAll();
  globalThis.fetch = fetchOriginal;
  await db.close();
}

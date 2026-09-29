import assert from 'node:assert/strict';
import type { PGlite } from '@electric-sql/pglite';
import { PDFDocument } from 'pdf-lib';
import * as invoices from '../../src/app/api/account/invoices/route';
import * as invoice from '../../src/app/api/account/invoices/[id]/route';
import * as exportApi from '../../src/app/api/invoices/export/route';
import { sampleInvoice } from '../../src/lib/invoice';
import { invoiceTemplates } from '../../src/lib/invoice-designs';

export async function verifyInvoices(
  db: PGlite,
  request: (route: string, actor?: string, body?: unknown) => Request,
  owner: string,
  other: string,
) {
  const document = sampleInvoice('2026-09-29');
  const create = (actor?: string, extra = {}) =>
    invoices.POST(request('/api/account/invoices', actor, { document, ...extra }));
  const context = (id: string) => ({ params: Promise.resolve({ id }) });
  assert.equal((await invoices.GET(request('/api/account/invoices'))).status, 401);
  assert.equal((await create()).status, 401);
  assert.equal((await create(owner)).status, 402);
  assert.equal((await create(owner, { user_id: other })).status, 400);
  assert.equal(
    (await exportApi.POST(request('/api/invoices/export', owner, { document }))).status,
    402,
  );
  assert.equal((await db.query('select * from invoices')).rows.length, 0);
  for (const design of invoiceTemplates.filter((item) => item.pro))
    assert.equal(
      (
        await exportApi.POST(
          request('/api/invoices/export', owner, {
            document: { ...document, template: design.id },
          }),
        )
      ).status,
      402,
      design.name,
    );
  await db.query(
    "insert into access_grants(user_id,until_at,reason) values($1,now()+interval '1 day','Invoice test') on conflict(user_id) do update set until_at=excluded.until_at",
    [owner],
  );
  const response = await create(owner);
  assert.equal(response.status, 201, await response.clone().text());
  const saved = (await response.json()).invoice;
  assert.equal(saved.user_id, undefined);
  assert.equal(saved.revision, 1);
  const list = await (await invoices.GET(request('/api/account/invoices', owner))).json();
  assert.equal(list.total, 1);
  assert.equal(list.invoices[0].document, undefined);
  assert.equal(list.invoices[0].summary.total, 235000);
  assert.equal((await invoices.GET(request('/api/account/invoices?page=0', owner))).status, 400);
  assert.equal(
    (await (await invoices.GET(request('/api/account/invoices', other))).json()).total,
    0,
  );
  assert.equal(
    (await invoice.GET(request('/api/account/invoices/' + saved.id, other), context(saved.id)))
      .status,
    404,
  );
  assert.equal(
    (await invoice.DELETE(request('/api/account/invoices/' + saved.id, other), context(saved.id)))
      .status,
    404,
  );
  assert.equal(
    (
      await invoice.PATCH(
        request('/api/account/invoices/' + saved.id, other, { document, revision: 1 }),
        context(saved.id),
      )
    ).status,
    404,
  );
  const updated = await invoice.PATCH(
    request('/api/account/invoices/' + saved.id, owner, {
      document: { ...document, number: 'INV-002', template: 'monogram' },
      revision: 1,
    }),
    context(saved.id),
  );
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).invoice.revision, 2);
  const reopened = await invoice.GET(
    request('/api/account/invoices/' + saved.id, owner),
    context(saved.id),
  );
  assert.equal((await reopened.json()).invoice.document.template, 'monogram');
  assert.equal(
    (
      await invoice.PATCH(
        request('/api/account/invoices/' + saved.id, owner, { document, revision: 1 }),
        context(saved.id),
      )
    ).status,
    409,
  );
  const exported = await exportApi.POST(
    request('/api/invoices/export', owner, {
      document: {
        ...document,
        template: 'studio',
        paymentQr: true,
        paymentUrl: 'https://example.com/pay',
      },
    }),
  );
  assert.equal(exported.status, 200, await exported.clone().text());
  assert.equal(exported.headers.get('content-type'), 'application/pdf');
  assert.ok((await PDFDocument.load(await exported.arrayBuffer())).getPageCount() >= 1);
  for (const design of invoiceTemplates.filter((item) => item.pro)) {
    const response = await exportApi.POST(
      request('/api/invoices/export', owner, { document: { ...document, template: design.id } }),
    );
    assert.equal(
      response.status,
      200,
      `${design.name}: ${response.status === 200 ? '' : await response.clone().text()}`,
    );
    assert.ok(
      (await PDFDocument.load(await response.arrayBuffer())).getPageCount() >= 1,
      design.name,
    );
  }
  // Full library allows updates, but never a 201st draft.
  await db.query(
    'insert into invoices(user_id,document,summary) select $1,$2,$3 from generate_series(1,199)',
    [owner, document, { number: 'seed' }],
  );
  assert.equal((await create(owner)).status, 409);
  assert.equal(
    (
      await invoice.PATCH(
        request('/api/account/invoices/' + saved.id, owner, { document, revision: 2 }),
        context(saved.id),
      )
    ).status,
    200,
  );
  await db.query('delete from invoices where user_id=$1 and id<>$2', [owner, saved.id]);
  // Expired accounts retain read/delete access, but no new saves or premium exports.
  await db.query('delete from access_grants where user_id=$1', [owner]);
  assert.equal(
    (await invoice.GET(request('/api/account/invoices/' + saved.id, owner), context(saved.id)))
      .status,
    200,
  );
  assert.equal(
    (
      await invoice.PATCH(
        request('/api/account/invoices/' + saved.id, owner, { document, revision: 3 }),
        context(saved.id),
      )
    ).status,
    402,
  );
  assert.equal(
    (await exportApi.POST(request('/api/invoices/export', owner, { document }))).status,
    402,
  );
  assert.equal(
    (await invoice.DELETE(request('/api/account/invoices/' + saved.id, owner), context(saved.id)))
      .status,
    204,
  );
  await db.exec('reset role; set role authenticated');
  await assert.rejects(db.query('select * from invoices'), /permission denied/);
  await assert.rejects(
    db.query('select save_invoice($1,null,null,$2,$3)', [owner, document, {}]),
    /permission denied/,
  );
  await db.exec('reset role; set role service_role');
}

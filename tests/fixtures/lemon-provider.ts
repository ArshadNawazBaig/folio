import assert from 'node:assert/strict';
import type { LemonPayment, LemonSubscription } from '../../src/lib/lemon-squeezy';
export const lemon = {
  fail: false,
  cancelCount: 0,
  checkoutCount: 0,
  checkoutBody: null as any,
  subscriptions: new Map<string, LemonSubscription>(),
  orders: new Map<string, LemonPayment>(),
  invoices: [] as LemonPayment[],
  async fetch(req: Request) {
    assert.equal(req.headers.get('authorization'), 'Bearer lemon_test_fixture');
    if (this.fail) return Response.json({ errors: [] }, { status: 503 });
    const url = new URL(req.url),
      [, , type, id] = url.pathname.split('/');
    // The invoice API uses camelCase sort keys, unlike the prices API.
    // Mirror its actual response so an invalid list query cannot pass billing tests.
    if (type === 'subscription-invoices' && url.searchParams.get('sort') === '-created_at')
      return Response.json(
        {
          errors: [
            {
              title: 'Invalid Query Parameter',
              detail: 'Sort parameter created_at is not allowed.',
            },
          ],
        },
        { status: 400 },
      );
    const resource = (attributes: unknown) => Response.json({ data: { type, id, attributes } });
    if (type === 'stores') return resource({ currency: 'USD' });
    if (type === 'variants')
      return resource({ product_id: 10, status: 'published', test_mode: true });
    if (type === 'products') return resource({ store_id: 1, status: 'published', test_mode: true });
    if (type === 'prices') {
      const variant = Number(url.searchParams.get('filter[variant_id]'));
      const trial = variant % 2 === 0,
        initial = variant <= 2;
      return Response.json({
        data: [
          {
            type,
            id: String(variant + 10),
            attributes: {
              variant_id: variant,
              category: 'subscription',
              scheme: 'standard',
              unit_price: initial ? 2500 : 3000,
              usage_aggregation: null,
              setup_fee_enabled: trial,
              setup_fee: trial ? (initial ? 100 : 200) : null,
              renewal_interval_unit: 'month',
              renewal_interval_quantity: 1,
              trial_interval_unit: trial ? 'day' : null,
              trial_interval_quantity: trial ? (initial ? 7 : 10) : null,
            },
          },
        ],
      });
    }
    if (type === 'checkouts') {
      assert.equal(req.method, 'POST');
      this.checkoutCount++;
      this.checkoutBody = await req.json();
      return Response.json({
        data: {
          type,
          id: '00000000-0000-4000-8000-000000009999',
          attributes: {
            test_mode: true,
            url: 'https://folio.lemonsqueezy.com/checkout/custom/fixture',
          },
        },
      });
    }
    if (type === 'subscriptions') {
      const sub = this.subscriptions.get(id);
      assert.ok(sub, `Missing test subscription ${id}`);
      if (req.method === 'DELETE') {
        sub.cancelled = true;
        sub.status = 'cancelled';
        sub.ends_at = sub.renews_at;
        this.cancelCount++;
      }
      if (req.method === 'PATCH') {
        const body = await req.json();
        sub.cancelled = body.data.attributes.cancelled;
        sub.status = 'active';
        sub.ends_at = null;
      }
      return resource(sub);
    }
    if (type === 'orders') {
      assert.ok(this.orders.has(id));
      return resource(this.orders.get(id));
    }
    if (type === 'subscription-invoices') {
      if (id) return resource(this.invoices[Number(id) - 1]);
      return Response.json({
        data: this.invoices.map((attributes, i) => ({ type, id: String(i + 1), attributes })),
      });
    }
    throw new Error(`Unhandled Lemon Squeezy test route ${req.method} ${url.pathname}`);
  },
};

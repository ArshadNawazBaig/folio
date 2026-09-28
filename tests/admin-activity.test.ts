import test from 'node:test';
import assert from 'node:assert/strict';
import { activityActor, activityDetail, activityPresentation } from '../src/lib/admin-activity';
import type { AuditEntry } from '../src/lib/platform';

const row: AuditEntry = {
  id: '00000000-0000-4000-8000-000000000001',
  actor_id: '00000000-0000-4000-8000-000000000002',
  target: '00000000-0000-4000-8000-000000000003',
  action: 'blog.publish',
  detail: { title: 'An article at the time it was published', version: 3 },
  created_at: '2026-09-28T12:00:00Z',
};

test('activity uses the recorded title and only creates article links for valid record IDs', () => {
  assert.equal(activityPresentation(row).title, row.detail.title);
  assert.equal(activityPresentation(row).href, `/admin/blog/${row.target}`);
  assert.equal(activityPresentation({ ...row, target: 'https://example.test' }).href, undefined);
  assert.equal(activityPresentation({ ...row, detail: {} }).title, 'Blog article');
});

test('a recorded request is not presented as completed without an explicit completion marker', () => {
  for (const action of ['pricing.request', 'subscription.request']) {
    for (const completed of [undefined, false, 'true']) {
      const presented = activityPresentation({ ...row, action, detail: { completed } });
      assert.equal(presented.label, 'Requested');
      assert.equal(presented.tone, 'neutral');
    }
    assert.equal(
      activityPresentation({ ...row, action, detail: { completed: true } }).label,
      'Request completed',
    );
  }
});

test('missing actors and unfamiliar actions keep honest, readable fallbacks', () => {
  assert.equal(activityActor(null), 'Actor not recorded');
  assert.equal(activityActor(row.actor_id, row.actor_id!), 'You');
  const unknown = activityPresentation({ ...row, action: 'export.archive_ready', detail: {} });
  assert.equal(unknown.label, 'Export archive ready');
  assert.equal(unknown.title, row.target);
  assert.equal(unknown.href, undefined);
  assert.equal(activityPresentation({ ...row, action: 'constructor' }).label, 'Constructor');
});

test('detail formatting retains zero, false, nested data, and the currency of recorded amounts', () => {
  assert.equal(activityDetail('version', 0, {}), '0');
  assert.equal(activityDetail('completed', false, {}), 'No');
  assert.equal(activityDetail('monthlyAmount', 2500, { currency: 'usd' }), '$25 USD');
  assert.equal(activityDetail('monthlyAmount', 2500, { currency: 'eur' }), '2500');
  const nested = { before: false, after: true };
  assert.deepEqual(JSON.parse(activityDetail('changes', nested, {})), nested);
});

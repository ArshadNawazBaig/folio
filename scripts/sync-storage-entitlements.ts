import nextEnv from '@next/env';
import { randomUUID } from 'node:crypto';
import { adminDb } from '../src/lib/server/auth';
import { syncSubscription } from '../src/lib/server/billing';
import { lemonConfig } from '../src/lib/server/lemon-squeezy';

// Run after migration 012 with --conditions=react-server. This re-reads verified
// provider payments; it never creates a checkout or charges a customer.
nextEnv.loadEnvConfig(process.cwd());
const db = adminDb();
const config = lemonConfig();
const probe = await db.from('billing_subscriptions').select('monthly_paid').limit(1);
if (probe.error) throw new Error('Apply migration 012 before syncing storage allowances.');
let offset = 0;
let synced = 0;
let failed = 0;
while (true) {
  const { data, error } = await db
    .from('lemon_checkouts')
    .select('subscription_id')
    .eq('store_id', config.storeId)
    .eq('test_mode', config.testMode)
    .not('subscription_id', 'is', null)
    .order('id')
    .range(offset, offset + 99);
  if (error) throw new Error('Subscriptions could not be listed. Check the database connection.');
  for (const checkout of data) {
    try {
      await syncSubscription(checkout.subscription_id, `storage-rollout-${randomUUID()}`);
      synced++;
    } catch {
      failed++;
      console.error(
        `Could not sync subscription ${checkout.subscription_id}. Retry after checking the billing connection.`,
      );
    }
  }
  if (data.length < 100) break;
  offset += data.length;
}
console.log(`Storage allowances synced: ${synced}; failed: ${failed}.`);
if (failed) process.exitCode = 1;

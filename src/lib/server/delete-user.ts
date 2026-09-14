import 'server-only';
import { adminDb } from './auth';
import { stripeClient } from './billing';
import { ApiError } from './http';
import { databaseError } from './platform';

// Keep the user and document metadata until external cleanup succeeds. A failed
// attempt stays suspended and can resume without losing the objects to remove.
export async function deleteUser(actor: string, userId: string, reason: string) {
  const db = adminDb();
  const started = await db.rpc('begin_user_deletion', {
    actor,
    target_user: userId,
    reason_text: reason,
  });
  databaseError(started.error);
  if (started.data?.status === 'deleted') return;

  const customer = await db
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();
  databaseError(customer.error);
  if (customer.data) {
    if (!process.env.STRIPE_SECRET_KEY)
      throw new ApiError(
        503,
        'Connect Stripe before deleting this billing account. The user is suspended; retry deletion after connecting Stripe.',
      );
    try {
      const stripe = stripeClient();
      const record = await stripe.customers.retrieve(customer.data.stripe_customer_id);
      // Stripe customer deletion also cancels active subscriptions. Deleted
      // customers remain retrievable, which makes this step safe to retry.
      if (!record.deleted) {
        const removed = await stripe.customers.del(record.id);
        if (!removed.deleted) throw new Error('Customer deletion was not confirmed.');
      }
    } catch {
      throw new ApiError(
        503,
        'Billing cleanup could not finish. The user remains suspended. Retry deletion to continue.',
      );
    }
  }

  const objects = await db.rpc('user_deletion_objects', { actor, target_user: userId });
  databaseError(objects.error);
  const files = objects.data as { bucket: string; path: string }[];
  for (const bucket of ['folio-documents', 'folio-recovery']) {
    const paths = files.filter((file) => file.bucket === bucket).map((file) => file.path);
    for (let index = 0; index < paths.length; index += 100) {
      const removed = await db.storage.from(bucket).remove(paths.slice(index, index + 100));
      if (removed.error)
        throw new ApiError(
          503,
          'Some files could not be deleted. The user remains suspended. Retry deletion to finish removing their data.',
        );
    }
  }

  // Hard deletion removes the Auth identity and sessions. SQL cascades and the
  // cleanup trigger remove workspaces, billing, usage, grants and support data.
  const removed = await db.auth.admin.deleteUser(userId, false);
  if (removed.error && removed.error.status !== 404 && removed.error.code !== 'user_not_found') {
    // The Auth request may have committed before its response was lost. The
    // transactional completion record is authoritative in that case.
    const completion = await db
      .from('user_deletions')
      .select('status')
      .eq('user_id', userId)
      .maybeSingle();
    if (!completion.error && completion.data?.status === 'deleted') return;
    throw new ApiError(
      503,
      'Account deletion could not finish. The user remains suspended. Retry deletion to continue.',
    );
  }
  // Successful Auth deletion completes the job and audit in the same SQL
  // transaction. A missing identity on a retry can still finish an older job.
  if (removed.error) {
    const finished = await db.rpc('finish_user_deletion', { actor, target_user: userId });
    databaseError(finished.error);
  }
}

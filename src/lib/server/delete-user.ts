import 'server-only';
import { adminDb } from './auth';
import { changeSubscription } from './billing';
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

  const subscriptions = await db
    .from('billing_subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId);
  databaseError(subscriptions.error);
  try {
    for (const subscription of subscriptions.data || []) {
      await changeSubscription(
        subscription.stripe_subscription_id,
        'cancel_now',
        `deletion_${userId}_${subscription.stripe_subscription_id}`,
      );
    }
  } catch {
    throw new ApiError(
      503,
      'Billing cleanup could not finish. The user remains suspended. Connect Lemon Squeezy and retry deletion to cancel renewals before removing their data.',
    );
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

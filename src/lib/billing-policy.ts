// Shared pure policy. Only a verified server-side subscription may supply these fields.
export function hasPaidAccess(
  subscription: { status: string; paid_until: string | null; current_period_end: string | null },
  now = Date.now(),
) {
  return (
    ['active', 'trialing'].includes(subscription.status) &&
    Date.parse(subscription.paid_until || '') > now &&
    Date.parse(subscription.current_period_end || '') > now
  );
}

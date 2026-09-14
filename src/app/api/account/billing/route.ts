import { adminDb, requireUser } from '@/lib/server/auth';
import { apiError, ApiError } from '@/lib/server/http';
export async function GET(request: Request) {
  try {
    const user = await requireUser(request, { allowSuspended: true });
    const db = adminDb();
    const [customer, subscriptions] = await Promise.all([
      db
        .from('billing_customers')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .maybeSingle(),
      db
        .from('billing_subscriptions')
        .select('status,current_period_end,cancel_at_period_end')
        .eq('user_id', user.id)
        .order('current_period_end', { ascending: false })
        .limit(1),
    ]);
    if (customer.error || subscriptions.error)
      throw new ApiError(503, 'Billing details could not be loaded. Please try again.');
    return Response.json({
      hasCustomer: !!customer.data,
      subscription: subscriptions.data?.[0] || null,
    });
  } catch (error) {
    return apiError(error);
  }
}

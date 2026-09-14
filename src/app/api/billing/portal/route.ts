import { adminDb, requireUser } from '@/lib/server/auth';
import { stripeClient } from '@/lib/server/billing';
import { apiError, ApiError } from '@/lib/server/http';
import { siteUrl } from '@/lib/seo';
export async function POST(request: Request) {
  try {
    const user = await requireUser(request, { allowSuspended: true });
    const { data, error } = await adminDb()
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError(404, 'There is no billing account to manage yet.');
    const session = await stripeClient().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${siteUrl}/dashboard?view=billing`,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    return apiError(error);
  }
}

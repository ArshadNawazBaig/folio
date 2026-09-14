import { adminDb, requireUser } from '@/lib/server/auth';
import { lemonConfig, lemonGet } from '@/lib/server/lemon-squeezy';
import { isLemonUrl, type LemonSubscription } from '@/lib/lemon-squeezy';
import { apiError, ApiError } from '@/lib/server/http';
export async function POST(request: Request) {
  try {
    const user = await requireUser(request, { allowSuspended: true });
    const { data, error } = await adminDb()
      .from('lemon_checkouts')
      .select('subscription_id,customer_id')
      .eq('user_id', user.id)
      .not('subscription_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    const owned = data?.[0];
    if (!owned) throw new ApiError(404, 'There is no billing account to manage yet.');
    const sub = await lemonGet<LemonSubscription>('subscriptions', owned.subscription_id);
    const config = lemonConfig();
    if (
      String(sub.customer_id) !== owned.customer_id ||
      String(sub.store_id) !== config.storeId ||
      sub.test_mode !== config.testMode ||
      !isLemonUrl(sub.urls.customer_portal, 'portal')
    )
      throw new ApiError(503, 'The billing portal could not be verified.');
    return Response.json({ url: sub.urls.customer_portal });
  } catch (error) {
    return apiError(error);
  }
}

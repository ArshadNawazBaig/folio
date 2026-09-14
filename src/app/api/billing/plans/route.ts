import { availablePlans } from '@/lib/server/billing';
import { apiError } from '@/lib/server/http';
import { getPlatform } from '@/lib/server/platform';
export async function GET() {
  try {
    const [{ catalog }, plans] = await Promise.all([getPlatform(), availablePlans()]);
    return Response.json({ plans, catalog, ready: plans.length > 0 });
  } catch (error) {
    return apiError(error);
  }
}

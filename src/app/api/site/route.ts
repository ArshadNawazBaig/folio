import { getPlatform } from '@/lib/server/platform';
import { apiError } from '@/lib/server/http';
export async function GET() {
  try {
    const { settings } = await getPlatform();
    return Response.json({ announcement: settings.announcement });
  } catch (error) {
    return apiError(error);
  }
}

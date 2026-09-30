import { getPlatform } from '@/lib/server/platform';
import { apiError } from '@/lib/server/http';
export async function GET() {
  try {
    const { settings } = await getPlatform();
    // Only the public announcement is shared. Account, billing and maintenance
    // decisions keep their separate private responses and short server cache.
    return Response.json(
      { announcement: settings.announcement },
      { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=30' } },
    );
  } catch (error) {
    const response = apiError(error);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
}

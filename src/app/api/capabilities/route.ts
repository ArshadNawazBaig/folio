import { remoteTools } from '@/lib/remote-types';
// Retired capabilities stay false for older clients, regardless of stored credentials.
export const dynamic = 'force-static';
export async function GET() {
  return Response.json({ tools: Object.fromEntries(remoteTools.map((tool) => [tool, false])) });
}

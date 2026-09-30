import { remoteTools } from '@/lib/remote-types';
import { remoteReady } from '@/lib/server/document-config';
// These flags depend only on deployment environment variables. Serve the same
// build-time result to every visitor instead of invoking a function each time.
export const dynamic = 'force-static';
export async function GET() {
  return Response.json({
    tools: Object.fromEntries(remoteTools.map((tool) => [tool, remoteReady(tool)])),
  });
}

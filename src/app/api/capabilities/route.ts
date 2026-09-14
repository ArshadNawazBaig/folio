import { remoteTools } from '@/lib/remote-types';
import { remoteReady } from '@/lib/server/document-providers';
export async function GET() {
  return Response.json({
    tools: Object.fromEntries(remoteTools.map((tool) => [tool, remoteReady(tool)])),
  });
}

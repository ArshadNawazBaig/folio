import 'server-only';
import { cache } from 'react';
import { tools } from '../tools';
import { summarizeTool } from '../tool-summary';
import { remoteTools, type RemoteTool } from '../remote-types';
import { remoteReady } from './document-providers';
export function isRemoteTool(slug: string): slug is RemoteTool {
  return remoteTools.includes(slug as RemoteTool);
}
export function serverTools() {
  return tools.map((tool) =>
    isRemoteTool(tool.slug) ? { ...tool, available: remoteReady(tool.slug) } : tool,
  );
}

// Share the same objects across server components so React can serialize each
// summary once when the header and a tool directory appear on the same page.
export const serverToolSummaries = cache(() => serverTools().map(summarizeTool));

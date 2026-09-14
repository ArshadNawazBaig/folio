import 'server-only';
import { tools } from '../tools';
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

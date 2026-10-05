import 'server-only';
import { cache } from 'react';
import { tools } from '../tools';
import { summarizeTool } from '../tool-summary';
export function serverTools() {
  return tools;
}

// Share summaries across server components to avoid duplicate serialization.
export const serverToolSummaries = cache(() => serverTools().map(summarizeTool));

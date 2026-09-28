import type { Tool } from './tools';

export type ToolSummary = Pick<
  Tool,
  'slug' | 'name' | 'short' | 'icon' | 'category' | 'color' | 'available' | 'keywords'
>;

// Search and navigation do not need tool-page articles, FAQs or processing options.
export function summarizeTool(tool: Tool): ToolSummary {
  const { slug, name, short, icon, category, color, available, keywords } = tool;
  return { slug, name, short, icon, category, color, available, keywords };
}

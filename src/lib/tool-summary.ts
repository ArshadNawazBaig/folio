import type { Tool, ToolCategory } from './tools';

export const categories: ToolCategory[] = [
  'Edit & organize',
  'Convert',
  'Forms & signing',
  'More possibilities',
];

export type ToolSummary = Pick<
  Tool,
  'slug' | 'name' | 'short' | 'icon' | 'category' | 'color' | 'available' | 'keywords'
>;

export function matchesToolSearch(tool: ToolSummary, query: string) {
  return `${tool.name} ${tool.short} ${tool.keywords.join(' ')}`
    .toLowerCase()
    .includes(query.trim().toLowerCase());
}

// Search and navigation do not need tool-page articles, FAQs or processing options.
export function summarizeTool(tool: Tool): ToolSummary {
  const { slug, name, short, icon, category, color, available, keywords } = tool;
  return { slug, name, short, icon, category, color, available, keywords };
}

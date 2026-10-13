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
  const normalize = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  const words = normalize(query).match(/[\p{L}\p{N}]+/gu) ?? [];
  const searchable = normalize(`${tool.name} ${tool.short} ${tool.keywords.join(' ')}`);
  return words.every((word) => searchable.includes(word));
}

// Search and navigation do not need tool-page articles, FAQs or processing options.
export function summarizeTool(tool: Tool): ToolSummary {
  const { slug, name, short, icon, category, color, available, keywords } = tool;
  return { slug, name, short, icon, category, color, available, keywords };
}

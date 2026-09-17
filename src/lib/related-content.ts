import { guides, type Guide } from './guides';
import type { Tool } from './tools';

export function guidesForTool(slug: string, limit = 3) {
  return guides
    .filter((guide) => guide.tool === slug || guide.relatedTools?.includes(slug))
    .sort((a, b) => Number(b.tool === slug) - Number(a.tool === slug))
    .slice(0, limit);
}

export function relatedGuides(guide: Guide, limit = 3) {
  const topics = new Set([guide.tool, ...(guide.relatedTools || [])]);
  const score = (other: Guide) =>
    Number(other.tool === guide.tool) * 4 +
    Number(other.category === guide.category) * 2 +
    [other.tool, ...(other.relatedTools || [])].filter((slug) => topics.has(slug)).length;
  return guides
    .filter((other) => other.slug !== guide.slug && score(other) > 0)
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
}

export function relatedTools(tool: Tool, catalog: Tool[], limit = 3) {
  const topics = new Set(
    guidesForTool(tool.slug, guides.length).flatMap((guide) => [
      guide.tool,
      ...(guide.relatedTools || []),
    ]),
  );
  return catalog
    .filter((other) => other.available && other.slug !== tool.slug)
    .map((other) => ({
      tool: other,
      score: Number(topics.has(other.slug)) * 2 + Number(other.category === tool.category),
    }))
    .filter((other) => other.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((other) => other.tool);
}

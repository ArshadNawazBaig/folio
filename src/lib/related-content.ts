import { guides, type Guide } from './guides';
import type { Tool } from './tools';
import { toolCollections, toolNextSteps } from './tool-collections';

// Keep the main editing workflows discoverable even as the guide library grows.
const preferredReading: Record<string, string[]> = {
  'edit-pdf': ['how-to-edit-a-pdf', 'how-to-edit-a-pdf-on-mobile', 'how-to-add-text-to-a-pdf'],
};

export function guidesForTool(slug: string, limit = 3) {
  const preferred = preferredReading[slug] || [];
  const rank = (guide: Guide) => {
    const index = preferred.indexOf(guide.slug);
    return index < 0 ? preferred.length : index;
  };
  return guides
    .filter((guide) => guide.tool === slug || guide.relatedTools?.includes(slug))
    .sort((a, b) => rank(a) - rank(b) || Number(b.tool === slug) - Number(a.tool === slug))
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
  const preferred = toolNextSteps[tool.slug];
  if (preferred)
    return preferred
      .flatMap((slug) => {
        const next = catalog.find((candidate) => candidate.slug === slug && candidate.available);
        return next && next.slug !== tool.slug ? [next] : [];
      })
      .slice(0, limit);
  const collection = toolCollections.find((group) => group.slugs.includes(tool.slug));
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
      score: Number(topics.has(other.slug)) * 2 + Number(collection?.slugs.includes(other.slug)),
    }))
    .filter((other) => other.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((other) => other.tool);
}

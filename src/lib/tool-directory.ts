import { categories, matchesToolSearch, type ToolSummary } from './tool-summary';
import { PAGE_SIZE } from './pagination.mjs';

export type DirectoryParams = Record<string, string | string[] | undefined>;
const single = (value: string | string[] | undefined) => (typeof value === 'string' ? value : '');

export function directoryHref(
  path: string,
  values: { q?: string; category?: string; page?: number; pageSize?: number } = {},
) {
  const query = new URLSearchParams();
  if (values.q) query.set('q', values.q);
  if (values.category) query.set('category', values.category);
  if (values.page && values.page > 1) query.set('page', String(values.page));
  if (values.pageSize && values.pageSize !== PAGE_SIZE)
    query.set('pageSize', String(values.pageSize));
  return `${path}${query.size ? `?${query}` : ''}`;
}

export function toolDirectory<T extends ToolSummary>(
  catalog: T[],
  params: DirectoryParams,
  conversionOnly = false,
) {
  const q = single(params.q).trim().slice(0, 120);
  const category =
    !conversionOnly && categories.some((value) => value === single(params.category))
      ? single(params.category)
      : '';
  const matches = catalog.filter(
    (tool) =>
      (!conversionOnly || tool.category === 'Convert') &&
      (!category || tool.category === category) &&
      matchesToolSearch(tool, q),
  );
  const path = conversionOnly ? '/convert' : '/tools';
  return {
    q,
    category,
    conversionOnly,
    path,
    total: matches.length,
    tools: matches,
    canonical: directoryHref(path, { q, category }),
    legacyPagination: params.page !== undefined || params.pageSize !== undefined,
    index: !q && !category,
  };
}

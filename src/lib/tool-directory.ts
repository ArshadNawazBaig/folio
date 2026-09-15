import { categories, type Tool } from './tools';
import { PAGE_SIZE, normalizePageSize, pageCount } from './pagination.mjs';

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

export function toolDirectory(catalog: Tool[], params: DirectoryParams, conversionOnly = false) {
  const q = single(params.q).trim().slice(0, 120);
  const category =
    !conversionOnly && categories.some((value) => value === single(params.category))
      ? single(params.category)
      : '';
  const pageSize = normalizePageSize(single(params.pageSize));
  const rawPage = single(params.page);
  const requestedPage = /^\d+$/.test(rawPage) ? Math.max(1, Math.min(100000, Number(rawPage))) : 1;
  const matches = catalog.filter(
    (tool) =>
      (!conversionOnly || tool.category === 'Convert') &&
      (!category || tool.category === category) &&
      `${tool.name} ${tool.short} ${tool.keywords.join(' ')}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const page = Math.min(requestedPage, pageCount(matches.length, pageSize));
  const path = conversionOnly ? '/convert' : '/tools';
  return {
    q,
    category,
    page,
    pageSize,
    conversionOnly,
    path,
    total: matches.length,
    tools: matches.slice((page - 1) * pageSize, page * pageSize),
    canonical: directoryHref(path, { q, category, page, pageSize }),
    href: directoryHref(path, { q, category, pageSize }),
    outOfRange: page !== requestedPage,
    index: !q && !category && pageSize === PAGE_SIZE,
  };
}

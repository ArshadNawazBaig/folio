import { z } from 'zod';
import { ApiError } from './http';
import { MAX_PAGE, PAGE_SIZE, PAGE_SIZES } from '../pagination.mjs';

export const pageSizeSchema = z.coerce
  .number()
  .int()
  .refine((size) => PAGE_SIZES.includes(size))
  .default(PAGE_SIZE);

export function requestedPageSize(params: URLSearchParams, key = 'pageSize') {
  const parsed = pageSizeSchema.safeParse(params.has(key) ? params.get(key) : undefined);
  if (!parsed.success) throw new ApiError(400, 'Choose 10, 25, 50, or 100 records per page.');
  return parsed.data;
}

export function requestedPage(params: URLSearchParams, key = 'page') {
  const parsed = z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE)
    .safeParse(params.get(key) || 1);
  if (!parsed.success) throw new ApiError(400, 'Choose a valid results page.');
  return parsed.data;
}
export function pageRange(page: number, pageSize = PAGE_SIZE): [number, number] {
  return [(page - 1) * pageSize, page * pageSize - 1];
}

type PageResult<T> = {
  data: T[] | null;
  error: { message: string; code?: string } | null;
  count: number | null;
};

export async function readPage<T>(
  query: { range: (from: number, to: number) => PromiseLike<PageResult<T>> },
  page = 1,
  pageSize = PAGE_SIZE,
  offset = pageRange(page, pageSize)[0],
): Promise<PageResult<T>> {
  const result = await query.range(offset, offset + pageSize - 1);
  if (result.error?.code !== 'PGRST103') return result;
  // PostgREST returns 416 without a count when deletion or a new filter leaves
  // the requested offset past the end. Recover the total so callers can clamp.
  const first = await query.range(0, 0);
  return first.error ? first : { ...first, data: [] };
}
export function fileFilters(params: URLSearchParams) {
  const parsed = z
    .object({
      q: z.string().max(120).default(''),
      sort: z.enum(['recent', 'name', 'size']).default('recent'),
    })
    .safeParse(Object.fromEntries(params));
  if (!parsed.success) throw new ApiError(400, 'Choose valid file filters.');
  return { ...parsed.data, page: requestedPage(params), pageSize: requestedPageSize(params) };
}
// PostgREST quoted filter values escape quotes and backslashes. Values cannot
// terminate the surrounding OR expression, including unusual verified emails.
export function filterLiteral(value: string) {
  return JSON.stringify(value);
}

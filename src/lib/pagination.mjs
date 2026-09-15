export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 25, 50, 100];
export const MAX_PAGE = 100000;

export function normalizePageSize(value) {
  const size = Number(value);
  return PAGE_SIZES.includes(size) ? size : PAGE_SIZE;
}

export function pageCount(total, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function pageWindow(page, total, pageSize = PAGE_SIZE) {
  const pages = pageCount(total, pageSize);
  const current = Math.min(pages, Math.max(1, page));
  return {
    page: current,
    pages,
    start: total ? (current - 1) * pageSize + 1 : 0,
    end: Math.min(current * pageSize, total),
  };
}

// Adapt existing fixed-size database RPCs without fetching the whole collection
// or requiring a database migration just to change the presentation page size.
export async function databasePage(page, fetchPage, pageSize = PAGE_SIZE, batchSize = 25) {
  const offset = (page - 1) * pageSize;
  const first = Math.floor(offset / batchSize) + 1;
  // Legacy RPCs limit their page number. Still return a total for a stale URL.
  const result = await fetchPage(Math.min(first, MAX_PAGE));
  if (first > MAX_PAGE) return { total: result.total, rows: [] };
  const rows = [...result.rows];
  const within = offset % batchSize;
  const last = Math.min(
    Math.ceil((offset + pageSize) / batchSize),
    Math.ceil(result.total / batchSize),
  );
  for (let next = first + 1; next <= last; next++) {
    rows.push(...(await fetchPage(next)).rows);
  }
  return { total: result.total, rows: rows.slice(within, within + pageSize) };
}

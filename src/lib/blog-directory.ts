import { directoryHref, type DirectoryParams } from './tool-directory';
import { PAGE_SIZE, normalizePageSize } from './pagination.mjs';

export function blogDirectory(params: DirectoryParams) {
  const single = (key: string) => (typeof params[key] === 'string' ? params[key].trim() : '');
  const q = single('q').slice(0, 120);
  const category = single('category').slice(0, 50);
  const rawPage = single('page');
  const page = /^\d+$/.test(rawPage) ? Math.max(1, Math.min(10000, Number(rawPage))) : 1;
  const pageSize = normalizePageSize(single('pageSize'));
  return {
    q,
    category,
    page,
    pageSize,
    canonical: directoryHref('/blog', { q, category, page, pageSize }),
    index: !q && !category && pageSize === PAGE_SIZE,
  };
}

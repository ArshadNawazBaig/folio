'use client';
import { useState } from 'react';
import { PAGE_SIZE, pageCount } from '@/lib/pagination.mjs';

export function useRecordPagination(total: number, resetKey = '') {
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [state, setState] = useState({ page: 1, key: resetKey });
  const page = state.key === resetKey ? Math.min(state.page, pageCount(total, pageSize)) : 1;
  if (state.key !== resetKey || state.page !== page) setState({ page, key: resetKey });
  return {
    page,
    total,
    pageSize,
    onPageSizeChange: (size: number) => {
      setPageSize(size);
      setState({ page: 1, key: resetKey });
    },
    onChange: (next: number) =>
      setState({ page: Math.max(1, Math.min(next, pageCount(total, pageSize))), key: resetKey }),
    start: (page - 1) * pageSize,
    end: page * pageSize,
  };
}

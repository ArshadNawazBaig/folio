'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZE, PAGE_SIZES, pageWindow } from '@/lib/pagination.mjs';
import { Dropdown } from './dropdown';
import s from './pagination.module.css';
import { useUiTranslation } from './ui-language';

type Props = {
  page: number;
  total: number;
  pageSize?: number;
  onPageSizeChange?: (pageSize: number) => void;
  onChange?: (page: number) => void;
  href?: string;
  disabled?: boolean;
  label?: string;
};

export function Pagination({
  page,
  total,
  pageSize = PAGE_SIZE,
  onPageSizeChange,
  onChange,
  href,
  disabled = false,
  label = 'Results pagination',
}: Props) {
  const t = useUiTranslation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unavailable = disabled || pending;
  const range = pageWindow(page, total, pageSize);
  const numbers = [...new Set([1, range.page - 1, range.page, range.page + 1, range.pages])]
    .filter((n) => n >= 1 && n <= range.pages)
    .sort((a, b) => a - b);
  const target = (next: number, size = pageSize) => {
    const url = new URL(href!, 'https://folio.invalid');
    if (next > 1) url.searchParams.set('page', String(next));
    else url.searchParams.delete('page');
    if (size === PAGE_SIZE) url.searchParams.delete('pageSize');
    else url.searchParams.set('pageSize', String(size));
    return `${url.pathname}${url.search}${url.hash}`;
  };
  const control = (next: number, title: string, child: React.ReactNode, blocked = false) => {
    const current = typeof child === 'number' && next === range.page;
    const props = {
      className: s.control,
      'aria-label': title,
      'aria-current': current ? ('page' as const) : undefined,
    };
    return href && !blocked && !unavailable ? (
      <Link {...props} href={target(next)} prefetch={false}>
        {child}
      </Link>
    ) : (
      <button
        {...props}
        type="button"
        disabled={blocked || unavailable}
        onClick={() => onChange?.(next)}
      >
        {child}
      </button>
    );
  };
  return (
    <nav className={s.pagination} aria-label={t(label)} aria-busy={unavailable}>
      <div className={s.details}>
        <p className={s.summary} aria-live="polite">
          <strong>
            {range.start}–{range.end}
          </strong>{' '}
          {t(total === 1 ? 'of {count} record' : 'of {count} records', {
            count: total.toLocaleString(),
          })}
        </p>
        <div className={s.pageSize}>
          <Dropdown
            label={t('Records per page')}
            hideLabel
            value={String(pageSize)}
            options={PAGE_SIZES.map((size) => ({
              value: String(size),
              label: t('{count} per page', { count: size }),
            }))}
            disabled={unavailable || (!href && !onPageSizeChange)}
            onValueChange={(value) => {
              const size = Number(value);
              if (size === pageSize || !PAGE_SIZES.includes(size)) return;
              if (href) startTransition(() => router.push(target(1, size), { scroll: false }));
              else onPageSizeChange?.(size);
            }}
          />
        </div>
      </div>
      <div className={s.controls}>
        {control(range.page - 1, t('Previous page'), <ChevronLeft size={17} />, range.page <= 1)}
        {numbers.map((n, i) => (
          <span className={s.number} key={n}>
            {i > 0 && n - numbers[i - 1] > 1 && (
              <span className={s.ellipsis} aria-hidden="true">
                …
              </span>
            )}
            {control(n, t('Page {page}', { page: n }), n)}
          </span>
        ))}
        <span className={s.compact}>
          {t('Page {page} of {pages}', { page: range.page, pages: range.pages })}
        </span>
        {control(
          range.page + 1,
          t('Next page'),
          <ChevronRight size={17} />,
          range.page >= range.pages,
        )}
      </div>
    </nav>
  );
}

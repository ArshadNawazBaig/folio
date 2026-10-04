'use client';

import Link from 'next/link';
import { useUiTranslation, useUiLocale } from './ui-language';
import { localizedHref } from '@/lib/i18n/translate';
import { useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { matchesToolSearch, type ToolSummary } from '@/lib/tool-summary';
import { ToolGrid } from './tool-grid';
import { ToolSearch } from './tool-search';
import styles from './home.module.css';

const filters = [
  'Popular',
  'Edit',
  'Organize',
  'Convert',
  'Sign & fill',
  'More possibilities',
] as const;
type Filter = (typeof filters)[number];
const editSlugs = new Set(['edit-pdf', 'edit-pdf-text', 'watermark-pdf', 'crop-pdf']);
const organizeSlugs = new Set([
  'merge-pdf',
  'split-pdf',
  'compress-pdf',
  'rotate-pdf',
  'organize-pdf',
  'page-numbers',
]);

export function HomeTools({
  tools,
  popularSlugs,
}: {
  tools: ToolSummary[];
  popularSlugs: string[];
}) {
  const tr = useUiTranslation();
  const locale = useUiLocale();
  const href = (path: string) => localizedHref(locale, path);
  const [filter, setFilter] = useState<Filter>('Popular');
  const [query, setQuery] = useState('');
  const search = query.trim().toLowerCase();
  const filtered = tools.filter((tool) => {
    if (!matchesToolSearch(tool, search)) return false;
    if (filter === 'Popular') return !!search || popularSlugs.includes(tool.slug);
    if (filter === 'Edit') return editSlugs.has(tool.slug);
    if (filter === 'Organize') return organizeSlugs.has(tool.slug);
    if (filter === 'Convert') return tool.category === 'Convert';
    if (filter === 'More possibilities') return tool.category === 'More possibilities';
    return tool.category === 'Forms & signing';
  });
  // Keep popular tools in their curated catalog order.
  const visible =
    filter === 'Popular' && !search
      ? [...filtered].sort((a, b) => popularSlugs.indexOf(a.slug) - popularSlugs.indexOf(b.slug))
      : filtered;

  return (
    <section className={styles.toolSection} aria-labelledby="home-tools-title">
      <div className="container">
        <div className={styles.toolHeading}>
          <h2 id="home-tools-title">{tr('What would you like to do?')}</h2>
          <ToolSearch value={query} onValueChange={setQuery} />
        </div>
        <div className={styles.filters} role="group" aria-label={tr('Filter home tools')}>
          {filters.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {tr(item)}
            </button>
          ))}
        </div>
        <p className="sr-only" role="status">
          {search
            ? tr('{count} tools found for “{query}”.', { count: visible.length, query })
            : tr('{count} tools found.', { count: visible.length })}
        </p>
        <ToolGrid tools={visible} />
        {!visible.length && (
          <div className={styles.empty}>
            <Search size={25} aria-hidden="true" />
            <h3>{tr('No tools found.')}</h3>
            <p>{tr('Try “merge”, “signature” or “image”.')}</p>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setQuery('');
                setFilter('Popular');
              }}
            >
              {tr('Reset filters')}
            </button>
          </div>
        )}
        <div className={styles.toolFootnote}>
          <p>{tr('Annotations and page tools are free. Original-text changes are free too.')}</p>
          <Link prefetch={false} href={href('/tools')}>
            {tr('Explore all tools')} <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

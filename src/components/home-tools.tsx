'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Search, X } from 'lucide-react';
import type { ToolSummary } from '@/lib/tool-summary';
import { ToolIcon } from './icon';
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
const descriptions: Record<string, string> = {
  'edit-pdf': 'Add text, notes and highlights.',
  'merge-pdf': 'Bring your documents together.',
  'split-pdf': 'Keep just the pages you need.',
  'compress-pdf': 'Optimize your PDF file.',
  'sign-pdf': 'Add your signature in seconds.',
  'image-to-pdf': 'Turn your images into a PDF.',
};
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
  const [filter, setFilter] = useState<Filter>('Popular');
  const [query, setQuery] = useState('');
  const search = query.trim().toLowerCase();
  const filtered = tools.filter((tool) => {
    if (
      search &&
      !`${tool.name} ${tool.short} ${tool.keywords.join(' ')}`.toLowerCase().includes(search)
    )
      return false;
    if (filter === 'Popular') return !!search || popularSlugs.includes(tool.slug);
    if (filter === 'Edit') return editSlugs.has(tool.slug);
    if (filter === 'Organize') return organizeSlugs.has(tool.slug);
    if (filter === 'Convert') return tool.category === 'Convert';
    if (filter === 'More possibilities') return tool.category === 'More possibilities';
    return tool.category === 'Forms & signing';
  });
  // Keep the familiar six starting points in the same order as the catalog.
  const visible =
    filter === 'Popular' && !search
      ? [...filtered].sort((a, b) => popularSlugs.indexOf(a.slug) - popularSlugs.indexOf(b.slug))
      : filtered;

  return (
    <section className={styles.toolSection} aria-labelledby="home-tools-title">
      <div className="container">
        <div className={styles.toolHeading}>
          <h2 id="home-tools-title">What would you like to do?</h2>
          <div className={styles.search} role="search" aria-label="Find a tool">
            <Search size={18} aria-hidden="true" />
            <input
              aria-label="Find a PDF tool"
              placeholder="Find a PDF tool"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              maxLength={120}
            />
            {query && (
              <button type="button" aria-label="Clear tool search" onClick={() => setQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>
        </div>
        <div className={styles.filters} role="group" aria-label="Filter home tools">
          {filters.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <p className="sr-only" role="status">
          {visible.length} tools found{search ? ` for ${query}` : ''}.
        </p>
        <div className={styles.toolGrid}>
          {visible.map((tool) => (
            <Link
              prefetch={false}
              href={`/${tool.slug}`}
              className={styles.toolCard}
              key={tool.slug}
            >
              <span className={styles.toolIcon}>
                <ToolIcon name={tool.icon} size={25} />
              </span>
              <span className={styles.toolCopy}>
                <strong>{tool.name}</strong>
                <span>{descriptions[tool.slug] || tool.short}</span>
                {!tool.available && <small>Coming soon</small>}
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ))}
        </div>
        {!visible.length && (
          <div className={styles.empty}>
            <Search size={25} aria-hidden="true" />
            <h3>No tools found.</h3>
            <p>Try “merge”, “signature” or “image”.</p>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setQuery('');
                setFilter('Popular');
              }}
            >
              Reset filters
            </button>
          </div>
        )}
        <div className={styles.toolFootnote}>
          <p>Annotations and page tools are free. Original-text changes require Pro.</p>
          <Link prefetch={false} href="/tools">
            Explore all tools <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}

'use client';
import { Pagination } from './pagination';
import { useRecordPagination } from './use-record-pagination';
import { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowUpRight, X } from 'lucide-react';
import { tools as defaultTools, categories, type Tool } from '@/lib/tools';
import { ToolIcon } from './icon';
export function ToolDirectory({
  conversionOnly = false,
  tools = defaultTools,
}: {
  conversionOnly?: boolean;
  tools?: Tool[];
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All tools');
  const matches = tools.filter(
    (t) =>
      (!conversionOnly || t.category === 'Convert') &&
      (category === 'All tools' || t.category === category) &&
      `${t.name} ${t.short} ${t.keywords.join(' ')}`.toLowerCase().includes(query.toLowerCase()),
  );
  const pagination = useRecordPagination(matches.length, `${query}|${category}`);
  return (
    <div className="tool-directory">
      <div className="directory-controls">
        <div className="directory-search">
          <Search size={18} />
          <input
            aria-label="Find a PDF tool"
            placeholder="Find just the tool you need…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
        {!conversionOnly && (
          <div className="category-tabs" aria-label="Filter tools">
            {['All tools', ...categories].map((c) => (
              <button
                aria-pressed={category === c}
                key={c}
                className={category === c ? 'active' : ''}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="directory-result-count" aria-live="polite">
        {matches.length} thoughtful tools. One place to work.
      </div>
      <div className="directory-grid">
        {matches.slice(pagination.start, pagination.end).map((t) => (
          <Link href={`/${t.slug}`} className="directory-card" key={t.slug}>
            <div className="directory-card-top">
              <span className={`tool-icon ${t.color}`}>
                <ToolIcon name={t.icon} size={24} />
              </span>
              {!t.available ? (
                <span className="status-label">COMING SOON</span>
              ) : (
                <ArrowUpRight size={17} />
              )}
            </div>
            <h2>{t.name}</h2>
            <p>{t.short}</p>
            <small>{t.category}</small>
          </Link>
        ))}
      </div>
      <Pagination {...pagination} label="Tools pagination" />
      {!matches.length && (
        <div className="directory-empty">
          <Search size={30} />
          <h2>A different word might do it.</h2>
          <p>Try “merge”, “smaller”, “signature”, or “image”.</p>
          <button
            className="button secondary"
            onClick={() => {
              setQuery('');
              setCategory('All tools');
            }}
          >
            Show all tools
          </button>
        </div>
      )}
    </div>
  );
}

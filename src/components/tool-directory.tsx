'use client';

import Link from 'next/link';
import Form from 'next/form';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { categories, type ToolSummary } from '@/lib/tool-summary';
import { directoryHref, toolDirectory } from '@/lib/tool-directory';
import { ToolGrid } from './tool-grid';
import { ToolSearch } from './tool-search';

export function ToolDirectory({
  directory: initial,
  catalog,
}: {
  directory: ReturnType<typeof toolDirectory>;
  catalog: ToolSummary[];
}) {
  const [query, setQuery] = useState(initial.q);
  const d = toolDirectory(
    catalog,
    {
      q: query,
      category: initial.category,
    },
    initial.conversionOnly,
  );
  const link = (category = d.category, q = d.q) => directoryHref(d.path, { q, category });
  return (
    <div className="tool-directory">
      <div className="directory-controls">
        <div className="directory-tool-heading">
          <h2>
            {d.conversionOnly ? 'What would you like to convert?' : 'What would you like to do?'}
          </h2>
          <Form className="directory-search" action={d.path} prefetch={false} scroll={false}>
            {d.category && <input type="hidden" name="category" value={d.category} />}
            <ToolSearch
              name="q"
              value={query}
              onValueChange={setQuery}
              clearHref={link(d.category, '')}
            />
          </Form>
        </div>
        {!d.conversionOnly && (
          <nav className="category-tabs" aria-label="Filter tools">
            {['', ...categories].map((category) => (
              <Link
                prefetch={false}
                href={link(category)}
                aria-current={category === d.category ? 'page' : undefined}
                key={category}
                className={category === d.category ? 'active' : ''}
              >
                {category || 'All tools'}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <div className="directory-result-count" role="status">
        {d.total} {d.total === 1 ? 'tool' : 'tools'} found{d.q ? ` for “${d.q}”` : ''}.
      </div>
      <ToolGrid tools={d.tools} className="directory-grid" cardClassName="directory-card" />
      {!d.tools.length && (
        <div className="directory-empty">
          <Search size={30} />
          <h2>A different word might do it.</h2>
          <p>Try “merge”, “smaller”, “signature”, or “image”.</p>
          <Link
            prefetch={false}
            className="button secondary"
            href={d.path}
            onClick={(event) => {
              if (
                initial.canonical === d.path &&
                !event.metaKey &&
                !event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey
              ) {
                event.preventDefault();
                setQuery('');
              }
            }}
          >
            Show all tools
          </Link>
        </div>
      )}
    </div>
  );
}

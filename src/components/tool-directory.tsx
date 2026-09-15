import Link from 'next/link';
import Form from 'next/form';
import { Search, ArrowRight, ArrowUpRight, X } from 'lucide-react';
import { categories } from '@/lib/tools';
import { directoryHref, type toolDirectory } from '@/lib/tool-directory';
import { PAGE_SIZE } from '@/lib/pagination.mjs';
import { Pagination } from './pagination';
import { ToolIcon } from './icon';

export function ToolDirectory({ directory: d }: { directory: ReturnType<typeof toolDirectory> }) {
  const link = (category = d.category, q = d.q) =>
    directoryHref(d.path, { q, category, pageSize: d.pageSize });
  return (
    <div className="tool-directory">
      <div className="directory-controls">
        <Form className="directory-search" action={d.path} role="search" prefetch={false}>
          <Search size={18} aria-hidden="true" />
          {d.category && <input type="hidden" name="category" value={d.category} />}
          {d.pageSize !== PAGE_SIZE && <input type="hidden" name="pageSize" value={d.pageSize} />}
          <input
            key={d.q}
            name="q"
            aria-label="Find a PDF tool"
            placeholder="Find just the tool you need…"
            defaultValue={d.q}
            maxLength={120}
          />
          {d.q && (
            <Link
              prefetch={false}
              href={link(d.category, '')}
              className="icon-button"
              aria-label="Clear search"
            >
              <X size={16} />
            </Link>
          )}
          <button className="icon-button" aria-label="Search directory">
            <ArrowRight size={18} />
          </button>
        </Form>
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
      <div className="directory-result-count">{d.total} thoughtful tools. One place to work.</div>
      <div className="directory-grid">
        {d.tools.map((tool) => (
          <Link prefetch={false} href={`/${tool.slug}`} className="directory-card" key={tool.slug}>
            <div className="directory-card-top">
              <span className={`tool-icon ${tool.color}`}>
                <ToolIcon name={tool.icon} size={24} />
              </span>
              {!tool.available ? (
                <span className="status-label">COMING SOON</span>
              ) : (
                <ArrowUpRight size={17} />
              )}
            </div>
            <h2>{tool.name}</h2>
            <p>{tool.short}</p>
            <small>{tool.category}</small>
          </Link>
        ))}
      </div>
      <Pagination
        page={d.page}
        pageSize={d.pageSize}
        total={d.total}
        href={d.href}
        label="Tools pagination"
      />
      {!d.tools.length && (
        <div className="directory-empty">
          <Search size={30} />
          <h2>A different word might do it.</h2>
          <p>Try “merge”, “smaller”, “signature”, or “image”.</p>
          <Link prefetch={false} className="button secondary" href={d.path}>
            Show all tools
          </Link>
        </div>
      )}
    </div>
  );
}

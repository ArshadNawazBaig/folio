'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search, ArrowUpRight, Menu, X, ChevronRight } from 'lucide-react';
import { Logo } from './logo';
import { tools as defaultTools } from '@/lib/tools';
import { ToolIcon } from './icon';
import { SiteAnnouncement } from './site-announcement';
import { useAccount } from './account-provider';
import { Skeleton, LoadingLabel } from './skeleton';
const nav = [
  ['Edit PDF', '/edit-pdf'],
  ['Convert', '/convert'],
  ['Forms', '/forms'],
  ['Translate PDF', '/translate-pdf'],
  ['All tools', '/tools'],
  ['Pricing', '/pricing'],
  ['Blog', '/blog'],
];
export function Header() {
  const { user, loading } = useAccount();
  const path = usePathname();
  const [tools, setTools] = useState(defaultTools);
  useEffect(() => {
    let active = true;
    fetch('/api/capabilities')
      .then((r) => r.json())
      .then((data) => {
        if (active && data.tools)
          setTools(
            defaultTools.map((t) =>
              t.slug in data.tools ? { ...t, available: data.tools[t.slug] === true } : t,
            ),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        dialog.current?.showModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const filtered = tools.filter((t) =>
    `${t.name} ${t.keywords.join(' ')}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <SiteAnnouncement />
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <nav aria-label="Main navigation" className="desktop-nav">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <button
              className="search-trigger"
              aria-label="Search tools"
              aria-haspopup="dialog"
              aria-controls="tool-search-dialog"
              onClick={() => dialog.current?.showModal()}
            >
              <Search size={17} aria-hidden="true" />
              <span>Search tools</span>
              <kbd aria-hidden="true">⌘ K</kbd>
            </button>
            {loading && !user ? (
              <span className="header-account" aria-busy="true">
                <LoadingLabel>Checking your account…</LoadingLabel>
                <Skeleton width={49} height={12} />
                <Skeleton width={15} height={15} className="header-account-icon-skeleton" />
              </span>
            ) : (
              <Link
                href={user ? '/dashboard' : '/account'}
                className="header-account"
                onClick={() => setMenu(false)}
              >
                {user ? 'Dashboard' : 'Sign in'}
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            )}
            <button
              className="icon-button mobile-menu"
              aria-label={menu ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setMenu(false)}>
                {label}
                <ChevronRight size={17} />
              </Link>
            ))}
            <Link href={user ? '/dashboard' : '/account'} onClick={() => setMenu(false)}>
              {user ? 'Dashboard' : 'Sign in'}
              <ChevronRight size={17} />
            </Link>
          </nav>
        )}
      </header>
      <dialog
        ref={dialog}
        id="tool-search-dialog"
        aria-label="Find a PDF tool"
        className="search-dialog"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="search-dialog-top">
          <div className="search-dialog-field">
            <Search size={19} aria-hidden="true" />
            <input
              aria-label="Search PDF tools"
              placeholder="Search PDF tools…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button
            aria-label="Close search"
            className="icon-button"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <p className="search-hint">Try “make my PDF smaller” or “fill a form”</p>
        <div className="search-results">
          {filtered.length ? (
            filtered.map((t) => (
              <Link href={`/${t.slug}`} key={t.slug} onClick={() => dialog.current?.close()}>
                <span className={`tool-icon ${t.color}`}>
                  <ToolIcon name={t.icon} />
                </span>
                <span>
                  <strong>{t.name}</strong>
                  <small>{t.short}</small>
                </span>
                {!t.available && <span className="status-label">Coming soon</span>}
                <ArrowUpRight size={16} />
              </Link>
            ))
          ) : (
            <p className="empty-search">No matching tools. Try “merge”, “text”, or “image”.</p>
          )}
        </div>
        <div className="search-dialog-footer">
          Your next step, a little easier.<kbd>ESC to close</kbd>
        </div>
      </dialog>
    </>
  );
}

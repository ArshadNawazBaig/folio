'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search, ArrowUpRight, Menu, X, ChevronRight } from 'lucide-react';
import { Logo } from './logo';
import type { ToolSummary } from '@/lib/tool-summary';
import { ToolIcon } from './icon';
import { SiteAnnouncement } from './site-announcement';
import { useAccount } from './account-provider';
import { Skeleton, LoadingLabel } from './skeleton';
const nav = [
  ['Tools', '/tools'],
  ['Invoice', '/invoice-generator'],
  ['Compressor', '/compress-images'],
  ['URL Shortener', '/url-shortener'],
  ['Pricing', '/pricing'],
  ['Guides', '/guides'],
  ['Blog', '/blog'],
];
const mobileNav = [
  ...nav,
  ['Edit PDF', '/edit-pdf'],
  ['Convert', '/convert'],
  ['Forms', '/forms'],
  ['Translate PDF', '/translate-pdf'],
];
export function HeaderClient({ initialTools }: { initialTools: ToolSummary[] }) {
  const { user, guest, loading, guestLoading } = useAccount();
  const hasAccount = !!user || guest;
  const checkingAccount = !user && (loading || guestLoading);
  const path = usePathname();
  const [tools, setTools] = useState(initialTools);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    if (!searchOpen) return;
    let active = true;
    fetch('/api/capabilities')
      .then((r) => r.json())
      .then((data) => {
        if (active && data.tools)
          setTools(
            initialTools.map((t) =>
              t.slug in data.tools ? { ...t, available: data.tools[t.slug] === true } : t,
            ),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [initialTools, searchOpen]);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (searchOpen) dialog.current?.showModal();
  }, [searchOpen]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
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
          <Logo light />
          <nav aria-label="Main navigation" className="desktop-nav">
            {nav.map(([label, href]) => (
              <Link
                prefetch={false}
                key={href}
                href={href}
                aria-current={path === href ? 'page' : undefined}
              >
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
              onClick={() => setSearchOpen(true)}
            >
              <Search size={17} aria-hidden="true" />
              <span>Search tools</span>
              <kbd aria-hidden="true">⌘ K</kbd>
            </button>
            {checkingAccount ? (
              <span className="header-account" aria-busy="true">
                <LoadingLabel>Checking your account…</LoadingLabel>
                <Skeleton width={49} height={12} />
                <Skeleton width={15} height={15} className="header-account-icon-skeleton" />
              </span>
            ) : (
              <Link
                prefetch={false}
                href={hasAccount ? '/dashboard' : '/account'}
                className="header-account"
                onClick={() => setMenu(false)}
              >
                {hasAccount ? 'Dashboard' : 'Sign in'}
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            )}
            <Link prefetch={false} href="/workspace" className="button header-editor-link">
              Open editor <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
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
            {mobileNav.map(([label, href]) => (
              <Link prefetch={false} key={href} href={href} onClick={() => setMenu(false)}>
                {label}
                <ChevronRight size={17} />
              </Link>
            ))}
            {!checkingAccount && (
              <Link
                prefetch={false}
                href={hasAccount ? '/dashboard' : '/account'}
                onClick={() => setMenu(false)}
              >
                {hasAccount ? 'Dashboard' : 'Sign in'} <ChevronRight size={17} />
              </Link>
            )}
          </nav>
        )}
      </header>
      <dialog
        ref={dialog}
        id="tool-search-dialog"
        aria-label="Find a PDF tool"
        className="search-dialog"
        onClose={() => setSearchOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        {searchOpen && (
          <>
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
                  <Link
                    prefetch={false}
                    href={`/${t.slug}`}
                    key={t.slug}
                    onClick={() => dialog.current?.close()}
                  >
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
          </>
        )}
      </dialog>
    </>
  );
}

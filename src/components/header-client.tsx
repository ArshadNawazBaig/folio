'use client';
import { FREE_LAUNCH } from '@/lib/access-policy';
import Link from 'next/link';
import { useUiTranslation, useUiLocale } from './ui-language';
import { signInHref } from '@/lib/auth-navigation';
import { localizedHref } from '@/lib/i18n/translate';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search, ArrowUpRight, Menu, X, ChevronRight } from 'lucide-react';
import { Logo } from './logo';
import type { ToolSummary } from '@/lib/tool-summary';
import { ToolIcon } from './icon';
import { SiteAnnouncement } from './site-announcement';
import { useAccount } from './account-provider';
import { Skeleton, LoadingLabel } from './skeleton';
import { LanguageSelector } from './language-selector';
const nav = [
  ['Tools', '/tools'],
  ['Invoice', '/invoice-generator'],
  ['Compressor', '/compress-images'],
  ['URL Shortener', '/url-shortener'],
  ...(!FREE_LAUNCH ? [['Pricing', '/pricing']] : []),
  ['Guides', '/guides'],
  ['Blog', '/blog'],
];
const mobileNav = [...nav, ['Edit PDF', '/edit-pdf'], ['Convert', '/convert'], ['Forms', '/forms']];
export function HeaderClient({ initialTools }: { initialTools: ToolSummary[] }) {
  const tr = useUiTranslation();
  const locale = useUiLocale();
  const href = (path: string) => localizedHref(locale, path);
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
  const filtered = tools
    .map((tool) => ({ ...tool, name: tr(tool.name), short: tr(tool.short) }))
    .filter((t) => `${t.name} ${t.keywords.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <SiteAnnouncement />
      <header className="site-header" lang={locale}>
        <div className="header-inner">
          <Logo light href={href('/')} label={tr('Folio home')} />
          <nav aria-label={tr('Main navigation')} className="desktop-nav">
            {nav.map(([label, target]) => (
              <Link
                prefetch={false}
                key={target}
                href={href(target)}
                aria-current={path === href(target) ? 'page' : undefined}
              >
                {tr(label)}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <LanguageSelector label={tr('Language')} />
            <button
              className="search-trigger"
              aria-label={tr('Search tools')}
              aria-haspopup="dialog"
              aria-controls="tool-search-dialog"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={17} aria-hidden="true" />
              <span>{tr('Search tools')}</span>
              <kbd aria-hidden="true">{tr('⌘ K')}</kbd>
            </button>
            {checkingAccount ? (
              <span className="header-account" aria-busy="true">
                <LoadingLabel>{tr('Checking your account…')}</LoadingLabel>
                <Skeleton width={49} height={12} />
                <Skeleton width={15} height={15} className="header-account-icon-skeleton" />
              </span>
            ) : (
              <Link
                prefetch={false}
                href={
                  hasAccount
                    ? href('/dashboard')
                    : locale === 'en'
                      ? '/account'
                      : signInHref(href('/dashboard'))
                }
                className="header-account"
                onClick={() => setMenu(false)}
              >
                {tr(hasAccount ? 'Dashboard' : 'Sign in')}
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            )}
            <button
              className="icon-button mobile-menu"
              aria-label={tr(menu ? 'Close navigation' : 'Open navigation')}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menu && (
          <nav className="mobile-nav" aria-label={tr('Mobile navigation')}>
            {mobileNav.map(([label, target]) => (
              <Link
                prefetch={false}
                key={target}
                href={href(target)}
                onClick={() => setMenu(false)}
              >
                {tr(label)}
                <ChevronRight size={17} />
              </Link>
            ))}
            {!checkingAccount && (
              <Link
                prefetch={false}
                href={
                  hasAccount
                    ? href('/dashboard')
                    : locale === 'en'
                      ? '/account'
                      : signInHref(href('/dashboard'))
                }
                onClick={() => setMenu(false)}
              >
                {tr(hasAccount ? 'Dashboard' : 'Sign in')} <ChevronRight size={17} />
              </Link>
            )}
          </nav>
        )}
      </header>
      <dialog
        ref={dialog}
        id="tool-search-dialog"
        aria-label={tr('Find a PDF tool')}
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
                  aria-label={tr('Search PDF tools')}
                  placeholder={tr('Search PDF tools…')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <button
                aria-label={tr('Close search')}
                className="icon-button"
                onClick={() => dialog.current?.close()}
              >
                <X size={20} />
              </button>
            </div>
            <p className="search-hint">{tr('Try “make my PDF smaller” or “fill a form”')}</p>
            <div className="search-results">
              {filtered.length ? (
                filtered.map((t) => (
                  <Link
                    prefetch={false}
                    href={href(`/${t.slug}`)}
                    key={t.slug}
                    onClick={() => dialog.current?.close()}
                  >
                    <span className="tool-icon">
                      <ToolIcon name={t.icon} />
                    </span>
                    <span>
                      <strong>{t.name}</strong>
                      <small>{t.short}</small>
                    </span>
                    {!t.available && <span className="status-label">{tr('Coming soon')}</span>}
                    <ArrowUpRight size={16} />
                  </Link>
                ))
              ) : (
                <p className="empty-search">
                  {tr('No matching tools. Try “merge”, “text”, or “image”.')}
                </p>
              )}
            </div>
            <div className="search-dialog-footer">
              {tr('Your next step, a little easier.')}
              <kbd>{tr('ESC to close')}</kbd>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}

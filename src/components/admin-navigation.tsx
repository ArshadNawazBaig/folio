'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowUpRight, BookOpen, ShieldCheck } from 'lucide-react';
import { adminNavigation } from '@/lib/admin-navigation';
import type { AdminSection } from '@/lib/platform';
import { Logo } from './logo';

export function AdminNavigation({
  section,
  onNavigate,
}: {
  section: AdminSection | 'blog';
  onNavigate?: (section: AdminSection) => void;
}) {
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const container = nav.current;
    const active = container?.querySelector<HTMLElement>('[aria-current="page"]');
    if (container && active && container.scrollWidth > container.clientWidth) {
      container.scrollLeft +=
        active.getBoundingClientRect().left -
        container.getBoundingClientRect().left -
        (container.clientWidth - active.offsetWidth) / 2;
    }
  }, [section]);
  return (
    <aside className="admin-sidebar">
      <Logo />
      <span className="admin-label">
        <ShieldCheck size={13} /> SUPER ADMIN
      </span>
      <nav ref={nav} aria-label="Admin navigation">
        {adminNavigation.map(([key, label, Icon]) =>
          onNavigate ? (
            <button
              key={key}
              aria-current={section === key ? 'page' : undefined}
              onClick={() => onNavigate(key)}
            >
              <Icon size={18} />
              {label}
            </button>
          ) : (
            <Link key={key} href={key === 'overview' ? '/admin' : `/admin?view=${key}`}>
              <Icon size={18} />
              {label}
            </Link>
          ),
        )}
        <Link href="/admin/blog" aria-current={section === 'blog' ? 'page' : undefined}>
          <BookOpen size={18} />
          Blog posts
        </Link>
      </nav>
      <Link className="admin-back" href="/">
        Open website <ArrowUpRight size={16} />
      </Link>
      <Link className="admin-back" href="/dashboard">
        Your account <ArrowUpRight size={16} />
      </Link>
    </aside>
  );
}

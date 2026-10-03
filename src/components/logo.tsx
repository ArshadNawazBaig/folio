'use client';
import Link from 'next/link';
import { useUiTranslation, useLocalizedHref } from './ui-language';
export function Logo({
  light = false,
  href = '/',
  label = 'Folio home',
}: {
  light?: boolean;
  href?: string;
  label?: string;
}) {
  const tr = useUiTranslation();
  const localHref = useLocalizedHref();
  return (
    <Link
      href={localHref(href)}
      className={`logo ${light ? 'logo-light' : ''}`}
      aria-label={tr(label)}
    >
      <svg width="29" height="34" viewBox="0 0 29 34" fill="none" aria-hidden="true">
        <path d="M2 2h24v7H10v7h12v7H10v9H2V2Z" fill="currentColor" />
        <path d="M15 27h12v5H15z" fill="var(--accent)" />
      </svg>
      <span>
        folio<span className="logo-dot">.</span>
      </span>
    </Link>
  );
}

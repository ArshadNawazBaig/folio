'use client';

import { usePathname } from 'next/navigation';
import { Languages, ChevronDown } from 'lucide-react';
import { locales, localeInfo, languageSwitchPath } from '@/lib/i18n/config';
import { saveLanguagePreference } from '@/lib/i18n/preference';
import { useUiLocale } from './ui-language';
import s from './language-selector.module.css';

export function LanguageSelector({
  label = 'Language',
  query,
}: {
  label?: string;
  query?: string;
}) {
  const pathname = usePathname();
  const locale = useUiLocale();
  return (
    <details className={s.selector}>
      <summary aria-label={`${label}: ${localeInfo[locale].name}`}>
        <Languages size={17} aria-hidden="true" />
        <span>{locale.toUpperCase()}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </summary>
      <nav className={s.menu} aria-label={label}>
        {locales.map((option) => (
          <a
            key={option}
            href={`${languageSwitchPath(pathname, option)}${query ? `?${query}` : ''}`}
            onClick={(event) => {
              saveLanguagePreference(option);
              // Keep filters, sign-in destinations and fragments as well as the dashboard tab.
              const target = new URL(event.currentTarget.href);
              target.search = query === undefined ? window.location.search : query;
              target.hash = window.location.hash;
              event.currentTarget.href = target.href;
              if (target.href === window.location.href) {
                event.preventDefault();
                event.currentTarget.closest('details')?.removeAttribute('open');
              }
            }}
            hrefLang={option}
            lang={option}
            aria-current={option === locale ? 'true' : undefined}
          >
            {localeInfo[option].name}
            {option === locale && <span aria-hidden="true">✓</span>}
          </a>
        ))}
      </nav>
    </details>
  );
}

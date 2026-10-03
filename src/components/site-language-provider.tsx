'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n/config';
import { localizedHref, type Messages } from '@/lib/i18n/translate';
import {
  getLanguagePreference,
  saveLanguagePreference,
  subscribeLanguagePreference,
} from '@/lib/i18n/preference';
import { loadUiMessages } from '@/lib/i18n/client-messages';
import { UiLanguageProvider } from './ui-language';

const serverPreference = () => null;

export function SiteLanguageProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const preference = useSyncExternalStore(
    subscribeLanguagePreference,
    getLanguagePreference,
    serverPreference,
  );
  // A translated URL is explicit. An English-only resource must not erase the saved choice.
  const selected = locale !== 'en' ? locale : (preference ?? locale);
  const [loaded, setLoaded] = useState<{ locale: Locale; messages: Messages } | null>(null);

  useEffect(() => {
    if (locale !== 'en') saveLanguagePreference(locale);
  }, [locale]);

  useEffect(() => {
    // Private editors render their interface from the selected client dictionary.
    document.documentElement.lang = ['/workspace', '/invoice-editor'].includes(pathname)
      ? selected
      : locale;
  }, [selected, pathname, locale]);

  useEffect(() => {
    if (locale !== 'en' || selected === 'en') return;
    const destination = localizedHref(selected, pathname);
    if (destination !== pathname) {
      router.replace(`${destination}${window.location.search}${window.location.hash}`);
      return;
    }
    let active = true;
    loadUiMessages(selected)
      .then((copy) => {
        if (active) setLoaded({ locale: selected, messages: copy });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [locale, selected, pathname, router]);

  return (
    <UiLanguageProvider
      locale={selected}
      messages={selected === locale ? messages : loaded?.locale === selected ? loaded.messages : {}}
    >
      {children}
    </UiLanguageProvider>
  );
}

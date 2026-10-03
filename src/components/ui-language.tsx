'use client';
import { createContext, useContext, useMemo } from 'react';
import { localizedHref, translator, type Messages } from '@/lib/i18n/translate';
import type { Locale } from '@/lib/i18n/config';
const UiLanguage = createContext<{ messages: Messages; locale: Locale }>({
  messages: {},
  locale: 'en',
});
export function UiLanguageProvider({
  messages,
  locale = 'en',
  children,
}: {
  messages: Messages;
  locale?: Locale;
  children: React.ReactNode;
}) {
  return <UiLanguage.Provider value={{ messages, locale }}>{children}</UiLanguage.Provider>;
}
// oxlint-disable-next-line react/only-export-components -- The context and hook share one API.
export function useUiTranslation() {
  const { messages } = useContext(UiLanguage);
  return useMemo(() => translator(messages), [messages]);
}

// oxlint-disable-next-line react/only-export-components -- Locale accompanies the translation hook.
export function useUiLocale() {
  return useContext(UiLanguage).locale;
}

// oxlint-disable-next-line react/only-export-components -- Shared locale-aware navigation.
export function useLocalizedHref() {
  const locale = useUiLocale();
  return useMemo(() => (path: string) => localizedHref(locale, path), [locale]);
}

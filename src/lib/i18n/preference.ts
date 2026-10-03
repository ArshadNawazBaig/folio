import { isLocale, type Locale } from './config';

export const LANGUAGE_PREFERENCE_KEY = 'folio-language';
const preferenceChanged = 'folio-language-changed';
let memoryPreference: Locale | null = null;

export function getLanguagePreference(): Locale | null {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_PREFERENCE_KEY);
    return stored && isLocale(stored) ? stored : null;
  } catch {
    return memoryPreference;
  }
}

export function saveLanguagePreference(locale: Locale) {
  memoryPreference = locale;
  try {
    window.localStorage.setItem(LANGUAGE_PREFERENCE_KEY, locale);
  } catch {
    // Navigation still works when the browser does not permit persistent storage.
  }
  window.dispatchEvent(new Event(preferenceChanged));
}

export function subscribeLanguagePreference(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === LANGUAGE_PREFERENCE_KEY || event.key === null) onChange();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(preferenceChanged, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(preferenceChanged, onChange);
  };
}

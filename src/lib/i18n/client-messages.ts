import type { Locale } from './config';
import type { Messages } from './translate';

const loaded = new Map<Locale, Promise<Messages>>();

// Only load the chosen dictionary when an English-only resource needs translated navigation.
export function loadUiMessages(locale: Locale) {
  let promise = loaded.get(locale);
  if (!promise) {
    promise = Promise.all([
      import(`./messages/${locale}.json`),
      import(`./site-messages/${locale}.json`),
      import(`./dashboard-messages/${locale}.json`),
      import(`./feature-messages/${locale}.json`),
    ]).then(([common, site, dashboard, features]) => ({
      ...features.default,
      ...site.default,
      ...common.default.ui,
      ...dashboard.default,
    }));
    loaded.set(locale, promise);
    promise.catch(() => loaded.delete(locale));
  }
  return promise;
}

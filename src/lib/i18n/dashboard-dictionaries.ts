import 'server-only';
import type { Locale } from './config';
import type { Messages } from './translate';

const dictionaries = {
  en: () => import('./dashboard-messages/en.json'),
  de: () => import('./dashboard-messages/de.json'),
  fr: () => import('./dashboard-messages/fr.json'),
  nl: () => import('./dashboard-messages/nl.json'),
  es: () => import('./dashboard-messages/es.json'),
  it: () => import('./dashboard-messages/it.json'),
  pt: () => import('./dashboard-messages/pt.json'),
  sv: () => import('./dashboard-messages/sv.json'),
  nb: () => import('./dashboard-messages/nb.json'),
  da: () => import('./dashboard-messages/da.json'),
  ja: () => import('./dashboard-messages/ja.json'),
  ko: () => import('./dashboard-messages/ko.json'),
};
export async function getDashboardMessages(locale: Locale): Promise<Messages> {
  return (await dictionaries[locale]()).default;
}

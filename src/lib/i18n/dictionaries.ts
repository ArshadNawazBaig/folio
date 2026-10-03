import 'server-only';
import { translatedToolSlugs, type Locale, type TranslatedToolSlug } from './config';

export type Dictionary = {
  title: string;
  description: string;
  directoryDescription: string;
  eyebrow: string;
  heading: string;
  intro: string;
  tools: string;
  home: string;
  language: string;
  skip: string;
  openEditor: string;
  englishNotice: string;
  englishResources: string;
  privacy: string;
  terms: string;
  guides: string;
  pricing: string;
  support: string;
  choosePdf: string;
  uploadTitle: string;
  uploadHint: string;
  opening: string;
  invalidPdf: string;
  tooLarge: string;
  guest: string;
  noInstall: string;
  how: string;
  details: string;
  faqTitle: string;
  related: string;
  footer: string;
  local: string;
  cloud: string;
  pricingNote: string;
  faq: [string, string][];
  catalog: Record<
    TranslatedToolSlug,
    {
      name: string;
      description: string;
      detail: string;
      action: string;
      steps: [string, string, string];
    }
  >;
  ui: Record<string, string>;
};

const dictionaries = {
  en: () => import('./messages/en.json'),
  de: () => import('./messages/de.json'),
  fr: () => import('./messages/fr.json'),
  nl: () => import('./messages/nl.json'),
  es: () => import('./messages/es.json'),
  it: () => import('./messages/it.json'),
  pt: () => import('./messages/pt.json'),
  sv: () => import('./messages/sv.json'),
  nb: () => import('./messages/nb.json'),
  da: () => import('./messages/da.json'),
  ja: () => import('./messages/ja.json'),
  ko: () => import('./messages/ko.json'),
};

const siteDictionaries = {
  en: () => import('./site-messages/en.json'),
  de: () => import('./site-messages/de.json'),
  fr: () => import('./site-messages/fr.json'),
  nl: () => import('./site-messages/nl.json'),
  es: () => import('./site-messages/es.json'),
  it: () => import('./site-messages/it.json'),
  pt: () => import('./site-messages/pt.json'),
  sv: () => import('./site-messages/sv.json'),
  nb: () => import('./site-messages/nb.json'),
  da: () => import('./site-messages/da.json'),
  ja: () => import('./site-messages/ja.json'),
  ko: () => import('./site-messages/ko.json'),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const data = (await dictionaries[locale]()).default;
  const site = (await siteDictionaries[locale]()).default;
  const features = (await import(`./feature-messages/${locale}.json`)).default;
  const dashboard = (await import(`./dashboard-messages/${locale}.json`)).default;
  const catalog = {} as Dictionary['catalog'];
  for (const slug of translatedToolSlugs) {
    const copy = data.catalog[slug];
    const [first, second, third] = copy.steps;
    catalog[slug] = { ...copy, steps: [first, second, third] };
  }
  return {
    ...data,
    ui: { ...features, ...site, ...data.ui, ...dashboard },
    catalog,
    faq: data.faq.map(([question, answer]) => [question, answer]),
  };
}

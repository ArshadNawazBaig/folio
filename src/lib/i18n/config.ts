import { toolPaths, guidePaths } from './routes';

export const locales = [
  'en',
  'de',
  'fr',
  'nl',
  'es',
  'it',
  'pt',
  'sv',
  'nb',
  'da',
  'ja',
  'ko',
] as const;
export type Locale = (typeof locales)[number];
export const localeInfo: Record<Locale, { name: string; social: string; regions: string[] }> = {
  en: {
    name: 'English',
    social: 'en_US',
    regions: ['en-US', 'en-GB', 'en-CA', 'en-AU', 'en-NZ', 'en-IE', 'en-SG'],
  },
  de: { name: 'Deutsch', social: 'de_DE', regions: ['de-DE', 'de-AT', 'de-CH'] },
  fr: { name: 'Français', social: 'fr_FR', regions: ['fr-FR', 'fr-CA', 'fr-BE', 'fr-CH'] },
  nl: { name: 'Nederlands', social: 'nl_NL', regions: ['nl-NL', 'nl-BE'] },
  es: { name: 'Español', social: 'es_ES', regions: ['es-ES', 'es-US'] },
  it: { name: 'Italiano', social: 'it_IT', regions: ['it-IT', 'it-CH'] },
  pt: { name: 'Português', social: 'pt_PT', regions: ['pt-PT', 'pt-BR'] },
  sv: { name: 'Svenska', social: 'sv_SE', regions: ['sv-SE'] },
  nb: { name: 'Norsk bokmål', social: 'nb_NO', regions: ['nb-NO'] },
  da: { name: 'Dansk', social: 'da_DK', regions: ['da-DK'] },
  ja: { name: '日本語', social: 'ja_JP', regions: ['ja-JP'] },
  ko: { name: '한국어', social: 'ko_KR', regions: ['ko-KR'] },
};

export const translatedToolSlugs = [
  'edit-pdf',
  'merge-pdf',
  'split-pdf',
  'compress-pdf',
  'sign-pdf',
  'image-to-pdf',
] as const;
export type TranslatedToolSlug = (typeof translatedToolSlugs)[number];
export const translatedPaths = [
  '/',
  '/tools',
  '/convert',
  '/forms',
  '/pricing',
  '/guides',
  '/blog',
  '/about',
  '/privacy',
  '/terms',
  '/security',
  ...toolPaths,
  ...guidePaths,
];
// Private routes support language switching, but never enter SEO alternates or the sitemap.
export const translatedPrivatePaths = ['/dashboard', '/account', '/support', '/maintenance'];

export function isTranslatedPath(path: string) {
  return (
    translatedPaths.includes(path) ||
    translatedPrivatePaths.includes(path) ||
    /^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)
  );
}

export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}

export function languagePath(locale: Locale, path = '/') {
  return locale === 'en' ? path : `/${locale}${path === '/' ? '' : path}`;
}

export function splitLanguagePath(pathname: string): { locale: Locale; path: string } {
  const [, first, ...rest] = pathname.split('/');
  return isLocale(first)
    ? { locale: first, path: `/${rest.join('/')}`.replace(/\/$/, '') || '/' }
    : { locale: 'en', path: pathname.replace(/\/$/, '') || '/' };
}

export function languageSwitchPath(pathname: string, locale: Locale) {
  const { path } = splitLanguagePath(pathname);
  // Resources without translated URLs keep their route while the UI preference changes.
  return isTranslatedPath(path) ? languagePath(locale, path) : path;
}

export function languageAlternates(path: string, origin: string) {
  if (!translatedPaths.includes(path)) return undefined;
  return Object.fromEntries([
    ['x-default', `${origin}${path}`],
    ...locales.flatMap((locale) =>
      [locale, ...localeInfo[locale].regions].map((tag) => [
        tag,
        `${origin}${languagePath(locale, path)}`,
      ]),
    ),
  ]);
}

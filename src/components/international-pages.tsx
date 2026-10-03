import { notFound } from 'next/navigation';
import { RootDocument } from './root-document';
import { Header } from './header';
import { Footer } from './footer';
import { HomePageContent } from './home-page-content';
import { DirectoryPageContent } from './directory-page-content';
import { ToolPageContent } from './tool-page-content';
import { InternationalResource, internationalResourceMetadata } from './international-resources';
import { serverTools, serverToolSummaries } from '@/lib/server/tool-catalog';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { localizeSummary, localizedHref } from '@/lib/i18n/translate';
import { toolDirectory, type DirectoryParams } from '@/lib/tool-directory';
import {
  languagePath,
  languageAlternates,
  localeInfo,
  translatedToolSlugs,
  translatedPaths,
  isTranslatedPath,
  type Locale,
} from '@/lib/i18n/config';
import { pageMetadata, listingMetadata, siteUrl } from '@/lib/seo';
import '@/app/features.css';

export type InternationalProps = {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<DirectoryParams>;
};

// oxlint-disable-next-line react/only-export-components -- Shared static route entry points.
export function internationalStaticParams() {
  return translatedPaths.map((path) => ({ path: path === '/' ? [] : path.slice(1).split('/') }));
}

async function pagePath({ params }: InternationalProps) {
  const { path = [] } = await params;
  const route = `/${path.join('/')}`;
  if (!isTranslatedPath(route)) notFound();
  return route;
}

// oxlint-disable-next-line react/only-export-components -- Shared static route entry points.
export async function internationalMetadata(locale: Locale, props: InternationalProps) {
  const path = await pagePath(props);
  const d = await getDictionary(locale);
  const tool = serverTools().find((tool) => path === `/${tool.slug}`);
  if (path !== '/' && path !== '/tools' && !tool)
    return internationalResourceMetadata(path, {
      locale,
      messages: d.ui,
      searchParams: props.searchParams,
    });
  const slug = translatedToolSlugs.find((slug) => path === `/${slug}`);
  const title = slug
    ? d.catalog[slug].name
    : tool
      ? (d.ui[tool.name] ?? tool.name)
      : path === '/tools'
        ? d.tools
        : d.title;
  const description = slug
    ? d.catalog[slug].description
    : tool
      ? (d.ui[tool.description] ?? tool.description)
      : path === '/tools'
        ? d.directoryDescription
        : d.description;
  const directory =
    path === '/tools'
      ? toolDirectory(
          serverToolSummaries().map((tool) => localizeSummary(tool, d.ui)),
          await props.searchParams,
        )
      : undefined;
  const canonical = directory
    ? localizedHref(locale, directory.canonical)
    : languagePath(locale, path);
  const metadata = directory
    ? listingMetadata(title, description, canonical, 1, directory.index)
    : pageMetadata(title, description, canonical, tool ? tool.available : true);
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      canonical,
      languages: directory && !directory.index ? undefined : languageAlternates(path, siteUrl),
    },
    openGraph: { ...metadata.openGraph, locale: localeInfo[locale].social },
  };
}

export async function InternationalLayout({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const d = await getDictionary(locale);
  return (
    <RootDocument locale={locale} skip={d.skip} messages={d.ui}>
      {children}
    </RootDocument>
  );
}

export async function InternationalPage(locale: Locale, props: InternationalProps) {
  const d = await getDictionary(locale);
  const content = await InternationalContent(locale, props);
  return (
    <>
      <Header messages={d.ui} />
      {content}
      <Footer />
    </>
  );
}

async function InternationalContent(locale: Locale, props: InternationalProps) {
  const path = await pagePath(props);
  const d = await getDictionary(locale);
  if (path === '/')
    return (
      <HomePageContent
        locale={locale}
        messages={d.ui}
        uploadCopy={{
          choosePdf: d.choosePdf,
          uploadTitle: d.uploadTitle,
          uploadHint: d.uploadHint,
          opening: d.opening,
          invalidPdf: d.invalidPdf,
          tooLarge: d.tooLarge,
        }}
      />
    );
  if (path === '/tools')
    return (
      <DirectoryPageContent locale={locale} messages={d.ui} params={await props.searchParams} />
    );
  const tool = serverTools().find((tool) => `/${tool.slug}` === path);
  if (!tool)
    return (
      <InternationalResource
        path={path}
        locale={locale}
        messages={d.ui}
        searchParams={props.searchParams}
      />
    );
  return <ToolPageContent locale={locale} messages={d.ui} tool={tool} />;
}

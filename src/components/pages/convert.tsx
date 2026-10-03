import {
  translator,
  localizedHref,
  localizeSummary,
  type PageLanguage,
} from '@/lib/i18n/translate';
import { permanentRedirect } from 'next/navigation';
import { serverToolSummaries } from '@/lib/server/tool-catalog';
import { ToolDirectory } from '@/components/tool-directory';
import { listingMetadata, breadcrumbSchema, collectionSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { toolDirectory, type DirectoryParams } from '@/lib/tool-directory';
type Props = { searchParams: Promise<DirectoryParams> };
export async function generateMetadata({
  searchParams,
  locale = 'en',
  messages = {},
}: Props & PageLanguage) {
  const href = (path: string) => localizedHref(locale, path);
  const directory = toolDirectory(
    serverToolSummaries().map((tool) => localizeSummary(tool, messages)),
    await searchParams,
    true,
  );
  return listingMetadata(
    'PDF Converter — Convert PDFs, Images & Text Online',
    'Convert PDF pages to JPG, PNG, or plain text. Combine JPG and PNG images into PDF documents for free in your browser.',
    href(directory.canonical),
    1,
    directory.index,
  );
}
export default async function ConvertPage({
  searchParams,
  locale = 'en',
  messages = {},
}: Props & PageLanguage) {
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);

  const catalog = serverToolSummaries().map((tool) => localizeSummary(tool, messages));
  const original = toolDirectory(catalog, await searchParams, true);
  const directory = { ...original, path: href(original.path), canonical: href(original.canonical) };
  if (directory.legacyPagination) permanentRedirect(directory.canonical);
  return (
    <main id="main" className="container directory-page with-page-heading">
      <StructuredData
        data={collectionSchema(
          'PDF and image converters',
          directory.canonical,
          directory.tools.map((tool) => ({ name: tool.name, path: `/${tool.slug}` })),
        )}
      />
      <StructuredData
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'PDF converter', path: '/convert' },
        ])}
      />
      <div className="directory-heading page-heading">
        <span className="eyebrow">{tr('A CHANGE OF FORMAT')}</span>
        <h1>
          {tr('Convert PDFs and images.')}
          <br />
          <em>{tr('Find the right format.')}</em>
        </h1>
        <p>
          {tr('Turn pages into pictures. Bring images together.')}
          <br />
          {tr('Find the format that fits what’s next.')}
        </p>
      </div>
      <ToolDirectory key={directory.canonical} directory={directory} catalog={catalog} />
      <p className="directory-footnote">
        {tr(
          'Image and text tools run locally. Office conversions are marked as coming soon until a processing service is connected.',
        )}
      </p>
    </main>
  );
}

import {
  translator,
  localizedHref,
  localizeSummary,
  type PageLanguage,
} from '@/lib/i18n/translate';
import Link from 'next/link';
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
          {tr(
            'Convert PDF pages to JPG, PNG, or plain text. Combine JPG and PNG images into PDF documents for free in your browser.',
          )}
        </p>
      </div>
      <ToolDirectory key={directory.canonical} directory={directory} catalog={catalog} />
      {!directory.q && (
        <section className="content-decisions" aria-labelledby="conversion-choice-title">
          <h2 id="conversion-choice-title">{tr('Choose the output you need')}</h2>
          <div className="tool-reading-grid">
            {[
              [
                '/pdf-to-png',
                'PDF pages as images',
                'Use PNG for small text, diagrams and screenshots. JPG often gives smaller files for photographs. Both turn each page into pixels: links, form fields and selectable text do not remain interactive.',
              ],
              [
                '/pdf-to-text',
                'PDF text for copying',
                'Choose TXT when you need the words rather than the page layout. Check the reading order of columns and tables. Image-only scans need OCR elsewhere before their words can be extracted.',
              ],
              [
                '/image-to-pdf',
                'Photos or screenshots in one PDF',
                'Arrange JPG, PNG or WebP images in reading order, then choose A4 or pages fitted to each image. Each image becomes one PDF page. This does not make photographed words searchable.',
              ],
              [
                '/guides/how-to-convert-pdf-to-images',
                'Check resolution before sharing',
                'A 300 DPI export gives more pixels than a 108 DPI export, but cannot restore missing detail. Open the downloaded image at its intended size and check the smallest text before sending it.',
              ],
            ].map(([path, title, text]) => (
              <Link href={href(path)} key={path}>
                <strong>{tr(title)}</strong>
                <span>{tr(text)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <p className="directory-footnote">{tr('Image and text tools run locally.')}</p>
    </main>
  );
}

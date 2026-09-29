import { permanentRedirect } from 'next/navigation';
import { serverToolSummaries } from '@/lib/server/tool-catalog';
import { ToolDirectory } from '@/components/tool-directory';
import { listingMetadata, breadcrumbSchema, collectionSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { toolDirectory, type DirectoryParams } from '@/lib/tool-directory';
type Props = { searchParams: Promise<DirectoryParams> };
export async function generateMetadata({ searchParams }: Props) {
  const directory = toolDirectory(serverToolSummaries(), await searchParams, true);
  return listingMetadata(
    'PDF Converter — Convert PDFs, Images & Text Online',
    'Convert PDF pages to JPG, PNG, or plain text. Combine JPG and PNG images into PDF documents for free in your browser.',
    directory.canonical,
    1,
    directory.index,
  );
}
export default async function ConvertPage({ searchParams }: Props) {
  const catalog = serverToolSummaries();
  const directory = toolDirectory(catalog, await searchParams, true);
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
        <span className="eyebrow">A CHANGE OF FORMAT</span>
        <h1>
          Convert PDFs and images.
          <br />
          <em>Find the right format.</em>
        </h1>
        <p>
          Turn pages into pictures. Bring images together.
          <br />
          Find the format that fits what’s next.
        </p>
      </div>
      <ToolDirectory key={directory.canonical} directory={directory} catalog={catalog} />
      <p className="directory-footnote">
        Image and text tools run locally. Office conversions are marked as coming soon until a
        processing service is connected.
      </p>
    </main>
  );
}

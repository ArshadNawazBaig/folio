import { redirect } from 'next/navigation';
import { serverTools } from '@/lib/server/tool-catalog';
import { ToolDirectory } from '@/components/tool-directory';
import { pageMetadata, breadcrumbSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { toolDirectory, type DirectoryParams } from '@/lib/tool-directory';
type Props = { searchParams: Promise<DirectoryParams> };
export async function generateMetadata({ searchParams }: Props) {
  const directory = toolDirectory(serverTools(), await searchParams, true);
  return pageMetadata(
    'PDF Converter — Convert PDFs, Images & Text Online',
    'Convert PDF pages to JPG, PNG, or plain text. Combine JPG and PNG images into PDF documents for free in your browser.',
    directory.canonical,
    directory.index,
  );
}
export default async function ConvertPage({ searchParams }: Props) {
  const directory = toolDirectory(serverTools(), await searchParams, true);
  if (directory.outOfRange) redirect(directory.canonical);
  return (
    <main id="main" className="container directory-page">
      <StructuredData
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'PDF converter', path: '/convert' },
        ])}
      />
      <div className="directory-heading">
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
      <ToolDirectory directory={directory} />
      <p className="directory-footnote">
        Image and text tools run locally. Office conversions are marked as coming soon until a
        processing service is connected.
      </p>
    </main>
  );
}

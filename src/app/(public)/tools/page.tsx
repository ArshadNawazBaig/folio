import { permanentRedirect } from 'next/navigation';
import { serverToolSummaries } from '@/lib/server/tool-catalog';
import { ToolDirectory } from '@/components/tool-directory';
import { listingMetadata, breadcrumbSchema, collectionSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { toolDirectory, type DirectoryParams } from '@/lib/tool-directory';
type Props = { searchParams: Promise<DirectoryParams> };
export async function generateMetadata({ searchParams }: Props) {
  const directory = toolDirectory(serverToolSummaries(), await searchParams);
  return listingMetadata(
    'All PDF Tools — Edit, Organize, Convert & Sign',
    'Find PDF tools for existing text editing, annotations, and password protection. Merge, split, convert, fill, and sign PDFs in one place.',
    directory.canonical,
    1,
    directory.index,
  );
}
export default async function ToolsPage({ searchParams }: Props) {
  const catalog = serverToolSummaries();
  const directory = toolDirectory(catalog, await searchParams);
  if (directory.legacyPagination) permanentRedirect(directory.canonical);
  return (
    <main id="main" className="container directory-page with-page-heading">
      <StructuredData
        data={collectionSchema(
          'Online PDF tools',
          directory.canonical,
          directory.tools.map((tool) => ({ name: tool.name, path: `/${tool.slug}` })),
        )}
      />
      <StructuredData
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'All PDF tools', path: '/tools' },
        ])}
      />
      <div className="directory-heading page-heading">
        <span className="eyebrow">YOUR DOCUMENT TOOLKIT</span>
        <h1>
          Online tools
          <br />
          <em>for every document.</em>
        </h1>
        <p>
          From a quick edit to the finishing touches.
          <br />
          Find what you need, and get on with your day.
        </p>
      </div>
      <ToolDirectory key={directory.canonical} directory={directory} catalog={catalog} />
    </main>
  );
}

import { redirect } from 'next/navigation';
import { serverTools } from '@/lib/server/tool-catalog';
import { ToolDirectory } from '@/components/tool-directory';
import { pageMetadata, breadcrumbSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { toolDirectory, type DirectoryParams } from '@/lib/tool-directory';
type Props = { searchParams: Promise<DirectoryParams> };
export async function generateMetadata({ searchParams }: Props) {
  const directory = toolDirectory(serverTools(), await searchParams);
  return pageMetadata(
    'All PDF Tools — Edit, Organize, Convert & Sign',
    'Find PDF tools for existing text editing, annotations, and password protection. Merge, split, convert, fill, and sign PDFs in one place.',
    directory.canonical,
    directory.index,
  );
}
export default async function ToolsPage({ searchParams }: Props) {
  const directory = toolDirectory(serverTools(), await searchParams);
  if (directory.outOfRange) redirect(directory.canonical);
  return (
    <main id="main" className="container directory-page">
      <StructuredData
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'All PDF tools', path: '/tools' },
        ])}
      />
      <div className="directory-heading">
        <span className="eyebrow">YOUR DOCUMENT TOOLKIT</span>
        <h1>
          Online PDF tools
          <br />
          <em>for every document.</em>
        </h1>
        <p>
          From a quick edit to the finishing touches.
          <br />
          Find what you need, and get on with your day.
        </p>
      </div>
      <ToolDirectory directory={directory} />
    </main>
  );
}

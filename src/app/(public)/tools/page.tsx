import { connection } from 'next/server';
import { serverTools } from '@/lib/server/tool-catalog';
import { ToolDirectory } from '@/components/tool-directory';
import { pageMetadata, breadcrumbSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
export const metadata = pageMetadata(
  'All PDF Tools — Edit, Organize, Convert & Sign',
  'Find PDF tools for existing text editing, annotations, and password protection. Merge, split, convert, fill, and sign PDFs in one place.',
  '/tools',
);
export default async function ToolsPage() {
  await connection();
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
          A tool for every
          <br />
          <em>little possibility.</em>
        </h1>
        <p>
          From a quick edit to the finishing touches.
          <br />
          Find what you need, and get on with your day.
        </p>
      </div>
      <ToolDirectory tools={serverTools()} />
    </main>
  );
}

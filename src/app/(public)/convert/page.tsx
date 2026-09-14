import { connection } from 'next/server';
import { serverTools } from '@/lib/server/tool-catalog';
import { ToolDirectory } from '@/components/tool-directory';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'PDF Converter — Convert PDFs, Images & Text Online',
  'Convert PDF pages to JPG, PNG, or plain text. Combine JPG and PNG images into PDF documents for free in your browser.',
  '/convert',
);
export default async function ConvertPage() {
  await connection();
  return (
    <main id="main" className="container directory-page">
      <div className="directory-heading">
        <span className="eyebrow">A CHANGE OF FORMAT</span>
        <h1>
          Same good ideas.
          <br />
          <em>A different kind of file.</em>
        </h1>
        <p>
          Turn pages into pictures. Bring images together.
          <br />
          Find the format that fits what’s next.
        </p>
      </div>
      <ToolDirectory tools={serverTools()} conversionOnly />
      <p className="directory-footnote">
        Image and text tools run locally. Office conversions are marked as coming soon until a
        processing service is connected.
      </p>
    </main>
  );
}

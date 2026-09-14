import { Suspense } from 'react';
import { Editor } from '@/components/editor';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Your PDF Workspace',
  'Your private, browser-based PDF editing workspace.',
  '/workspace',
  false,
);
export default function Workspace() {
  return (
    <Suspense
      fallback={
        <main id="main" className="page-loading">
          Opening your workspace…
        </main>
      }
    >
      <Editor />
    </Suspense>
  );
}

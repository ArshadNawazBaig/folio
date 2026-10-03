import { Suspense } from 'react';
import { Editor } from '@/components/editor';
import { pageMetadata } from '@/lib/seo';
import { EditorSkeleton } from '@/components/editor-skeleton';
export const metadata = pageMetadata(
  'Your PDF Workspace',
  'Your private, browser-based PDF editing workspace.',
  '/workspace',
  false,
);
export default function Workspace() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Editor />
    </Suspense>
  );
}

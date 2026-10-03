import { Suspense } from 'react';
import { InvoiceGenerator } from '@/components/invoice-generator';
import { Logo } from '@/components/logo';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Invoice Editor',
  'Create, preview, and download your invoice in a dedicated workspace.',
  '/invoice-editor',
  false,
);

export default function InvoiceEditorPage() {
  return (
    <Suspense
      fallback={
        <main id="main" className="editor-app" aria-busy="true">
          <header className="editor-header">
            <Logo light />
            <span>Loading invoice editor…</span>
          </header>
        </main>
      }
    >
      <InvoiceGenerator />
    </Suspense>
  );
}

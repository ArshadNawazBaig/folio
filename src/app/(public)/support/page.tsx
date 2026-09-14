import { SupportPanel } from '@/components/support-panel';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Contact Folio support',
  'Ask a question about your documents, account, or subscription.',
  '/support',
  false,
);
export default function SupportPage() {
  return (
    <main id="main" className="container support-page">
      <div className="support-heading">
        <span className="eyebrow">A HUMAN QUESTION DESERVES AN ANSWER</span>
        <h1>
          A little help,
          <br />
          <em>right when you need it.</em>
        </h1>
      </div>
      <SupportPanel />
    </main>
  );
}

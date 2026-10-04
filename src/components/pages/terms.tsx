import { translator, localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Terms of Service — Free Tools, Accounts & Files',
  'Read Folio’s service terms covering free tools, document use, private storage, accounts, and support.',
  '/terms',
);

export default function TermsPage({ locale = 'en', messages = {} }: PageLanguage = {}) {
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);

  return (
    <main id="main" className="container prose-page with-page-heading">
      <header className="page-heading">
        <span className="eyebrow">{tr('CLEAR EXPECTATIONS')}</span>
        <h1>
          {tr('Terms for')} <em>{tr('using Folio.')}</em>
        </h1>
        <p>
          {tr('Updated')} <time dateTime="2026-10-04">{tr('October 4, 2026')}</time>.
        </p>
      </header>
      <p>
        {tr(
          'These terms describe use of Folio at thebestfreepdf.com, including its free tools, accounts, and private cloud storage.',
        )}
      </p>
      <h2>{tr('Your documents and account.')}</h2>
      <p>
        {tr(
          'Only upload and process documents you own or have permission to use. You remain responsible for their contents and for how you use and share the results. Keep your sign-in details private and sign out on shared devices. Do not access another person’s account or files, bypass access controls, or disrupt the service.',
        )}
      </p>
      <h2>{tr('All tools are currently free.')}</h2>
      <p>
        {tr(
          'All available tools, downloads, invoice designs, and account options are free during this launch period. No payment or subscription is required. Tool availability, file sizes, and processing limits still apply. Pricing may be introduced in a future release; using the free service does not automatically enroll you in a paid plan.',
        )}
      </p>
      <h2>{tr('Storage and saved work.')}</h2>
      <p>
        {tr(
          'Guest workspaces include 100 MB of private storage. Signed-in accounts include 1 GB. Guest files expire after 24 hours and are tied to the browser session. Sign in to keep files in your account. Individual-file and processing limits still apply. If your account reaches its current storage allowance, delete older files before uploading more.',
        )}
      </p>
      <p>
        {tr(
          'Wait for “All changes saved” before leaving the editor, and keep your own original and downloaded copies. Saved work, account information, and deletion are described on our',
        )}{' '}
        <Link href={href('/privacy')}>{tr('privacy page')}</Link>.
      </p>
      <h2>{tr('Check the finished document.')}</h2>
      <p>
        {tr(
          'Results depend on the PDF’s structure, fonts, and images. Not every text object can be edited, and a scanned page may need OCR that is not included in the original-text editor. Review the downloaded file before relying on or sharing it. Visual signatures are not certificate-based digital signatures, and covering content is not secure redaction.',
        )}
      </p>
      <h2>{tr('Help with the service.')}</h2>
      <p>
        {tr('If a feature or saved file is not working as expected,')}{' '}
        <Link href={href('/support')}>{tr('contact Folio support')}</Link>
        {tr(
          '. Include the relevant tool and a description of the issue without sharing confidential documents or account credentials.',
        )}
      </p>
    </main>
  );
}

import { translator, localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Terms of Service — Accounts, Files & Billing',
  'Read Folio’s service terms covering document use, guest storage, paid downloads, subscription renewals, cancellation, and support.',
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
          {tr('Updated')} <time dateTime="2026-09-18">{tr('September 18, 2026')}</time>.
        </p>
      </header>
      <p>
        {tr(
          'These terms describe use of Folio at thebestfreepdf.com, including its PDF tools, accounts, cloud storage, and paid downloads. The',
        )}{' '}
        <Link href={href('/pricing')}>{tr('pricing page')}</Link>{' '}
        {tr('and checkout show the offer available when you subscribe.')}
      </p>
      <h2>{tr('Your documents and account.')}</h2>
      <p>
        {tr(
          'Only upload and process documents you own or have permission to use. You remain responsible for their contents and for how you use and share the results. Keep your sign-in details private and sign out on shared devices. Do not access another person’s account or files, bypass access controls, or disrupt the service.',
        )}
      </p>
      <h2>{tr('Free tools and paid downloads.')}</h2>
      <p>
        {tr(
          'Available free workflows include adding text and annotations, visual signatures, and page tools. You can try original-text editing before purchasing; downloading a document with original-text changes requires paid access. Password-protected downloads also require a plan. Check the tool’s availability and the download message before purchasing.',
        )}
      </p>
      <h2>{tr('Subscriptions, renewals, and cancellation.')}</h2>
      <p>
        {tr(
          'Lemon Squeezy provides hosted checkout and billing. Review the amount, currency, taxes, introductory period, and renewal price displayed at checkout before confirming payment. A paid introductory offer renews into the stated monthly subscription unless cancelled before renewal. Monthly subscriptions also renew automatically unless cancelled.',
        )}
      </p>
      <p>
        {tr('Manage your subscription and stop renewal through billing in your')}{' '}
        <Link href={href('/dashboard')}>{tr('dashboard')}</Link>
        {tr(
          '. Cancellation stops future renewals; it does not itself issue a refund. For a payment or refund question,',
        )}{' '}
        <Link href={href('/support')}>{tr('contact support')}</Link>{' '}
        {tr(
          'with your order reference. Do not send card details. These service terms do not replace the purchase terms displayed by Lemon Squeezy or any applicable consumer rights.',
        )}
      </p>
      <h2>{tr('Storage and saved work.')}</h2>
      <p>
        {tr(
          'Free accounts and guests have 100 MB of private storage. Guest files expire after 24 hours and are tied to the browser session. The paid introductory period includes 1 GB; a paid monthly subscription includes unlimited total storage while its entitlement is active. Individual-file and processing limits still apply. If your account reaches its current storage allowance, delete older files before uploading more.',
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
        {tr('If a feature, saved file, or subscription is not working as expected,')}{' '}
        <Link href={href('/support')}>{tr('contact Folio support')}</Link>
        {tr(
          '. Include the relevant tool and a description of the issue without sharing confidential documents or account credentials.',
        )}
      </p>
    </main>
  );
}

import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Terms of Service — Accounts, Files & Billing',
  'Read Folio’s service terms covering document use, guest storage, paid downloads, subscription renewals, cancellation, and support.',
  '/terms',
);

export default function TermsPage() {
  return (
    <main id="main" className="container prose-page">
      <span className="eyebrow">CLEAR EXPECTATIONS</span>
      <h1>
        Terms for <em>using Folio.</em>
      </h1>
      <p>
        Updated <time dateTime="2026-09-18">September 18, 2026</time>.
      </p>
      <p>
        These terms describe use of Folio at thebestfreepdf.com, including its PDF tools, accounts,
        cloud storage, and paid downloads. The <Link href="/pricing">pricing page</Link> and
        checkout show the offer available when you subscribe.
      </p>
      <h2>Your documents and account.</h2>
      <p>
        Only upload and process documents you own or have permission to use. You remain responsible
        for their contents and for how you use and share the results. Keep your sign-in details
        private and sign out on shared devices. Do not access another person’s account or files,
        bypass access controls, or disrupt the service.
      </p>
      <h2>Free tools and paid downloads.</h2>
      <p>
        Available free workflows include adding text and annotations, visual signatures, and page
        tools. You can try original-text editing before purchasing; downloading a document with
        original-text changes requires paid access. Password-protected downloads also require a
        plan. Check the tool’s availability and the download message before purchasing.
      </p>
      <h2>Subscriptions, renewals, and cancellation.</h2>
      <p>
        Lemon Squeezy provides hosted checkout and billing. Review the amount, currency, taxes,
        introductory period, and renewal price displayed at checkout before confirming payment. A
        paid introductory offer renews into the stated monthly subscription unless cancelled before
        renewal. Monthly subscriptions also renew automatically unless cancelled.
      </p>
      <p>
        Manage your subscription and stop renewal through billing in your{' '}
        <Link href="/dashboard">dashboard</Link>. Cancellation stops future renewals; it does not
        itself issue a refund. For a payment or refund question,{' '}
        <Link href="/support">contact support</Link> with your order reference. Do not send card
        details. These service terms do not replace the purchase terms displayed by Lemon Squeezy or
        any applicable consumer rights.
      </p>
      <h2>Storage and saved work.</h2>
      <p>
        Free accounts and guests have 100 MB of private storage. Guest files expire after 24 hours
        and are tied to the browser session. The paid introductory period includes 1 GB; a paid
        monthly subscription includes unlimited total storage while its entitlement is active.
        Individual-file and processing limits still apply. If your account reaches its current
        storage allowance, delete older files before uploading more.
      </p>
      <p>
        Wait for “All changes saved” before leaving the editor, and keep your own original and
        downloaded copies. Saved work, account information, and deletion are described on our{' '}
        <Link href="/privacy">privacy page</Link>.
      </p>
      <h2>Check the finished document.</h2>
      <p>
        Results depend on the PDF’s structure, fonts, and images. Not every text object can be
        edited, and a scanned page may need OCR that is not included in the original-text editor.
        Review the downloaded file before relying on or sharing it. Visual signatures are not
        certificate-based digital signatures, and covering content is not secure redaction.
      </p>
      <h2>Help with the service.</h2>
      <p>
        If a feature, saved file, or subscription is not working as expected,{' '}
        <Link href="/support">contact Folio support</Link>. Include the relevant tool and a
        description of the issue without sharing confidential documents or account credentials.
      </p>
    </main>
  );
}

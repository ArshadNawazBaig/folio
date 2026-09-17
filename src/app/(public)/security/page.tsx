import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Report a Security Issue',
  'Report a suspected vulnerability in Folio privately through support. Find the information to include and how to protect document and account data.',
  '/security',
);

export default function SecurityPage() {
  return (
    <main id="main" className="container prose-page">
      <span className="eyebrow">HELP KEEP DOCUMENTS PRIVATE</span>
      <h1>
        Report a <em>security issue.</em>
      </h1>
      <p>
        If you find a suspected vulnerability in Folio, use our{' '}
        <Link href="/support">support form</Link> and start the subject with “Security report”.
        Reports go to Folio’s administrators and are not published on the website.
      </p>
      <h2>What should your report include?</h2>
      <ol>
        <li>The affected page or feature and a short description of what happened.</li>
        <li>Steps to reproduce the problem with your own account and a sample document.</li>
        <li>Your browser, device, and the approximate time you noticed the issue.</li>
      </ol>
      <h2>Keep sensitive information out of your report.</h2>
      <p>
        Do not include passwords, access tokens, payment details, or other people’s documents.
        Describe the problem using a non-sensitive example. Do not access someone else’s files or
        disrupt the service to demonstrate an issue.
      </p>
      <p>
        For questions about a file, payment, or account, the same{' '}
        <Link href="/support">support form</Link> is available. Our{' '}
        <Link href="/privacy">privacy page</Link> explains how documents and support messages are
        handled.
      </p>
    </main>
  );
}

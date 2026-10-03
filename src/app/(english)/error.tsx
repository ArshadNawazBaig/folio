'use client';
import { useUiTranslation, useLocalizedHref } from '@/components/ui-language';
import Link from 'next/link';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tr = useUiTranslation();
  const href = useLocalizedHref();
  return (
    <main id="main" className="container with-page-heading">
      <header className="page-heading">
        <span className="eyebrow">{tr('LET’S TRY THAT AGAIN')}</span>
        <h1>{tr('A little interruption.')}</h1>
        <p>
          {tr('This page could not finish loading. Try again, or return to your document tools.')}
        </p>
        <button className="button primary" onClick={reset}>
          {tr('Try again')}
        </button>
        <Link className="text-link" href={href('/tools')} style={{ marginTop: 20 }}>
          {tr('Back to all tools')}
        </Link>
      </header>
    </main>
  );
}

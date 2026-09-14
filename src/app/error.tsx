'use client';
import Link from 'next/link';
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main" className="not-found">
      <span className="eyebrow">LET’S TRY THAT AGAIN</span>
      <h1>A little interruption.</h1>
      <p>This page could not finish loading. Try again, or return to your document tools.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
      <Link className="text-link" href="/tools" style={{ marginTop: 20 }}>
        Back to all tools
      </Link>
    </main>
  );
}

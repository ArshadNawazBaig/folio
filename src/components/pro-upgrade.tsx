'use client';
import Link from 'next/link';
import { ArrowRight, Check, Gem, LockKeyhole } from 'lucide-react';
export function ProUpgrade({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`pro-upgrade ${compact ? 'compact' : ''}`}>
      <span className="pro-badge">
        <Gem size={13} /> FOLIO PRO
      </span>
      <h2>Go beyond the finishing touches.</h2>
      <p>
        Edit existing PDF text, find and replace words, and protect your finished document with a
        password.
      </p>
      {!compact && (
        <ul>
          {[
            'Replace original text and adjust its font',
            'Find and replace across text blocks',
            'Protect PDFs with an opening password',
          ].map((item) => (
            <li key={item}>
              <Check size={16} />
              {item}
            </li>
          ))}
        </ul>
      )}
      <Link className="button primary" href="/pricing">
        Explore Pro pricing <ArrowRight size={16} />
      </Link>
      <small>Review the current price and renewal terms before checkout.</small>
      <small>
        <LockKeyhole size={12} /> Edit and preview free. Pro is required for finished downloads.
      </small>
    </div>
  );
}

'use client';
import { FREE_LAUNCH } from '@/lib/access-policy';
import { useUiTranslation, useLocalizedHref } from '@/components/ui-language';

import Link from 'next/link';
import { ArrowRight, Check, Gem, LockKeyhole } from 'lucide-react';
export function ProUpgrade({ compact = false }: { compact?: boolean }) {
  const tr = useUiTranslation();
  const href = useLocalizedHref();
  if (FREE_LAUNCH) return null;

  return (
    <div className={`pro-upgrade ${compact ? 'compact' : ''}`}>
      <span className="pro-badge">
        <Gem size={13} /> {tr('FOLIO PRO')}
      </span>
      <h2>{tr('Go beyond the finishing touches.')}</h2>
      <p>
        {tr(
          'Edit existing PDF text, find and replace words, and protect your finished document with a password.',
        )}
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
              {tr(item)}
            </li>
          ))}
        </ul>
      )}
      <Link className="button primary" href={href('/pricing')}>
        {tr('Explore Pro pricing')} <ArrowRight size={16} />
      </Link>
      <small>{tr('Review the current price and renewal terms before checkout.')}</small>
      <small>
        <LockKeyhole size={12} />{' '}
        {tr('Edit and preview free. Pro is required for finished downloads.')}
      </small>
    </div>
  );
}

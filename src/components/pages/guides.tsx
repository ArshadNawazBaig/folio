import { translator, localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { guides } from '@/lib/guides';
import { pageMetadata, collectionSchema, breadcrumbSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
export const metadata = pageMetadata(
  'PDF Editor Comparisons & Practical PDF Guides',
  'Compare free PDF editors, learn to type on a PDF or edit on your phone, and follow clear guides to signing, merging, splitting and organizing documents.',
  '/guides',
);
export default function Guides({ locale = 'en', messages = {} }: PageLanguage = {}) {
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);

  return (
    <main id="main" className="container guides-page with-page-heading">
      <StructuredData
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'PDF guides', path: '/guides' },
        ])}
      />
      <StructuredData
        data={collectionSchema(
          'PDF guides',
          '/guides',
          guides.map((g) => ({ name: g.title, path: `/guides/${g.slug}` })),
        )}
      />
      <div className="directory-heading page-heading">
        <span className="eyebrow">{tr('A LITTLE KNOW-HOW GOES A LONG WAY')}</span>
        <h1>
          {tr('Practical PDF guides.')}
          <br />
          <em>{tr('A little more clarity.')}</em>
        </h1>
        <p>
          {tr(
            'Choose an editor, learn a useful technique, and finish your next PDF with confidence.',
          )}
        </p>
      </div>
      <div className="guides-grid">
        {guides.map((g, i) => (
          <Link href={href(`/guides/${g.slug}`)} key={g.slug}>
            <div className={`guide-art guide-art-${i % 4}`}>
              <span>{tr('FOLIO / FIELD NOTES')}</span>
              <strong>{String(i + 1).padStart(2, '0')}</strong>
              <small>{tr(g.category)}</small>
            </div>
            <div className="guide-card-content">
              <span className="eyebrow">
                {tr(g.category)} · {tr(g.readTime)}
              </span>
              <h2>
                {tr(g.title)}
                <ArrowUpRight size={20} />
              </h2>
              <p>{tr(g.description)}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

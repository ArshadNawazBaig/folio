import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { guides } from '@/lib/guides';
import { pageMetadata, collectionSchema, breadcrumbSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
export const metadata = pageMetadata(
  'PDF Guides — Practical Help for Your Documents',
  'Clear guides to editing PDFs, merging and splitting pages, optimizing file size, and creating fillable forms with Folio.',
  '/guides',
);
export default function Guides() {
  return (
    <main id="main" className="container guides-page">
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
      <div className="directory-heading">
        <span className="eyebrow">A LITTLE KNOW-HOW GOES A LONG WAY</span>
        <h1>
          Practical PDF guides.
          <br />
          <em>A little more clarity.</em>
        </h1>
        <p>Practical notes for the documents in your day.</p>
      </div>
      <div className="guides-grid">
        {guides.map((g, i) => (
          <Link href={`/guides/${g.slug}`} key={g.slug}>
            <div className={`guide-art guide-art-${i % 4}`}>
              <span>FOLIO / FIELD NOTES</span>
              <strong>{String(i + 1).padStart(2, '0')}</strong>
              <small>{g.category}</small>
            </div>
            <div className="guide-card-content">
              <span className="eyebrow">
                {g.category} · {g.readTime}
              </span>
              <h2>
                {g.title}
                <ArrowUpRight size={20} />
              </h2>
              <p>{g.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}

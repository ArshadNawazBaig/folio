import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { guides } from '@/lib/guides';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'PDF Guides — Practical Help for Your Documents',
  'Clear guides to editing PDFs, merging and splitting pages, optimizing file size, and creating fillable forms with Folio.',
  '/guides',
);
export default function Guides() {
  return (
    <main id="main" className="container guides-page">
      <div className="directory-heading">
        <span className="eyebrow">A LITTLE KNOW-HOW GOES A LONG WAY</span>
        <h1>
          Good work starts
          <br />
          <em>with a little clarity.</em>
        </h1>
        <p>Practical notes for the documents in your day.</p>
      </div>
      <div className="guides-grid">
        {guides.map((g, i) => (
          <Link href={`/guides/${g.slug}`} key={g.slug}>
            <div className={`guide-art guide-art-${i % 4}`}>
              <span>FOLIO / FIELD NOTES</span>
              <strong>0{i + 1}</strong>
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

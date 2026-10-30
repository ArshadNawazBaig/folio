import { translator, localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { guides } from '@/lib/guides';
import { guideEdition } from '@/lib/guide-edition';
import { guideTopics } from '@/lib/guide-topics';
import { pageMetadata, collectionSchema, breadcrumbSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import styles from '@/components/guide-directory.module.css';
export const metadata = pageMetadata(
  'PDF Editor Comparisons & Practical PDF Guides',
  'Compare free PDF editors, learn to type on a PDF or edit on your phone, and follow clear guides to signing, merging, splitting and organizing documents.',
  '/guides',
);
export default function Guides({ locale = 'en', messages = {} }: PageLanguage = {}) {
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);
  const topics = guideTopics.map((topic) => ({
    ...topic,
    guides: guides
      .filter((guide) => topic.categories.includes(guide.category))
      .map((guide) => guideEdition(guide, locale)),
  }));

  return (
    <main id="main" className="container guides-page with-page-heading">
      <StructuredData
        data={breadcrumbSchema([
          { name: tr('Home'), path: href('/') },
          { name: tr('PDF guides'), path: href('/guides') },
        ])}
      />
      <StructuredData
        data={collectionSchema(
          tr('PDF guides'),
          href('/guides'),
          topics.flatMap((topic) =>
            topic.guides.map((g) => ({ name: tr(g.title), path: href(`/guides/${g.slug}`) })),
          ),
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
      <nav className={styles.topics} aria-label={tr('On this page')}>
        {topics.map((topic) => (
          <a href={`#${topic.id}`} key={topic.id}>
            {tr(topic.title)}
          </a>
        ))}
      </nav>
      {topics.map((topic) => (
        <section
          className={styles.topic}
          id={topic.id}
          key={topic.id}
          aria-labelledby={`${topic.id}-heading`}
        >
          <h2 id={`${topic.id}-heading`}>{tr(topic.title)}</h2>
          <div className="guides-grid">
            {topic.guides.map((g) => (
              <Link href={href(`/guides/${g.slug}`)} key={g.slug}>
                <div
                  className={`guide-art guide-art-${guides.findIndex((source) => source.slug === g.slug) % 4}`}
                  aria-hidden="true"
                >
                  <span>{tr('FOLIO / FIELD NOTES')}</span>
                  <strong>
                    {String(guides.findIndex((source) => source.slug === g.slug) + 1).padStart(
                      2,
                      '0',
                    )}
                  </strong>
                  <small>{tr(g.category)}</small>
                </div>
                <div className="guide-card-content">
                  <span className="eyebrow">
                    {tr(g.category)} · {tr(g.readTime)}
                  </span>
                  <h3>
                    {tr(g.title)}
                    <ArrowUpRight size={20} aria-hidden="true" />
                  </h3>
                  <p>{tr(g.description)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

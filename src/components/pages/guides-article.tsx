import { translator, localizedHref, localizeGuide, type PageLanguage } from '@/lib/i18n/translate';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { guides } from '@/lib/guides';
import { getTool } from '@/lib/tools';
import { pageMetadata, breadcrumbSchema, siteUrl, organizationSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { relatedGuides } from '@/lib/related-content';
import styles from '@/components/guide-content.module.css';
export const dynamicParams = false;
export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}
export async function generateMetadata({
  params,
  locale = 'en',
  messages = {},
}: { params: Promise<{ slug: string }> } & PageLanguage) {
  const { slug } = await params;
  const source = guides.find((g) => g.slug === slug);
  const g = source ? localizeGuide(source, messages, locale) : undefined;
  if (!g) return {};
  const base = pageMetadata(g.title, g.description, localizedHref(locale, `/guides/${g.slug}`));
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: 'article',
      publishedTime: g.published,
      modifiedTime: g.updated,
      authors: [`${siteUrl}/about`],
    },
  };
}
export default async function Guide({
  params,
  locale = 'en',
  messages = {},
}: { params: Promise<{ slug: string }> } & PageLanguage) {
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);

  const { slug } = await params;
  const source = guides.find((g) => g.slug === slug);
  const g = source ? localizeGuide(source, messages, locale) : undefined;
  if (!g) notFound();
  const tool = getTool(g.tool)!;
  return (
    <main id="main" className="container article-page with-page-heading">
      <StructuredData
        data={breadcrumbSchema([
          { name: tr('Home'), path: href('/') },
          { name: tr('Guides'), path: href('/guides') },
          { name: g.title, path: href(`/guides/${g.slug}`) },
        ])}
      />
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: g.title,
          description: g.description,
          datePublished: g.published,
          dateModified: g.updated,
          author: { '@type': 'Organization', name: 'Folio', url: `${siteUrl}/about` },
          publisher: organizationSchema(),
          inLanguage: locale,
          image: `${siteUrl}/og?title=${encodeURIComponent(g.title)}`,
          mainEntityOfPage: `${siteUrl}${href(`/guides/${g.slug}`)}`,
        }}
      />

      <article>
        <header className="article-heading page-heading page-heading--article">
          <nav className="breadcrumbs" aria-label={tr('Breadcrumb')}>
            <Link href={href('/guides')}>{tr('Guides')}</Link>
            <ChevronRight size={13} />
            <span>{tr(g.category)}</span>
          </nav>
          <span className="eyebrow">
            {tr(g.category)} · {tr(g.readTime)}
          </span>
          <h1>{tr(g.title)}</h1>
          <p>{tr(g.description)}</p>
          <span className="article-date">
            <Link href={href('/about')}>{tr('Folio field notes')}</Link> {tr('· Updated')}{' '}
            <time dateTime={g.updated}>
              {new Date(`${g.updated}T00:00:00Z`).toLocaleDateString(locale, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </time>
          </span>
        </header>
        <div className="article-body">
          {g.summary && (
            <aside className={styles.summary} aria-label={tr('Key takeaways')}>
              <strong>{tr('Key takeaways')}</strong>
              <p>{g.summary}</p>
            </aside>
          )}
          <nav className="article-contents" aria-label={tr('On this page')}>
            <strong>{tr('On this page')}</strong>
            <ol>
              {g.sections.map((section, i) => (
                <li key={section.title}>
                  <a href={`#section-${i + 1}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>
          {g.sections.map((section, i) => (
            <section key={section.title} id={`section-${i + 1}`}>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
              {section.steps && (
                <ol className={styles.steps}>
                  {section.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
              {section.table && (
                <div
                  className={styles.tableScroll}
                  role="region"
                  aria-label={section.table.caption}
                  tabIndex={0}
                >
                  <table className={styles.table}>
                    <caption>{section.table.caption}</caption>
                    <thead>
                      <tr>
                        {section.table.columns.map((column) => (
                          <th key={column} scope="col">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row) => (
                        <tr key={row.name}>
                          <th scope="row">
                            {row.href ? <a href={href(row.href)}>{row.name}</a> : row.name}
                          </th>
                          {row.cells.map((cell, index) => (
                            <td key={index}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {section.links && (
                <ul className="article-next-links">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link prefetch={false} href={href(link.href)}>
                        {link.label} <ArrowUpRight size={14} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {section.figure && (
                <figure className={styles.figure}>
                  <Image
                    src={section.figure.src}
                    alt={section.figure.alt}
                    width={section.figure.width}
                    height={section.figure.height}
                    sizes="(max-width: 450px) 90vw, 390px"
                  />
                  <figcaption>{section.figure.caption}</figcaption>
                </figure>
              )}
            </section>
          ))}
          <div className="article-cta">
            <span>{tr('Put a little clarity into practice.')}</span>
            <Link prefetch={false} className="button primary" href={href(`/${tool.slug}`)}>
              {tr('Open')} {tr(tool.name)} <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </article>
      <div className="article-related">
        <h2>{tr('A little more reading.')}</h2>
        {relatedGuides(g).map((other) => (
          <Link key={other.slug} href={href(`/guides/${other.slug}`)}>
            {tr(other.title)}
            <ArrowUpRight size={17} />
          </Link>
        ))}
      </div>
    </main>
  );
}

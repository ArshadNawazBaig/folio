import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { guides } from '@/lib/guides';
import { getTool } from '@/lib/tools';
import { pageMetadata, breadcrumbSchema, siteUrl, organizationSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { relatedGuides } from '@/lib/related-content';
export const dynamicParams = false;
export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = guides.find((g) => g.slug === slug);
  if (!g) return {};
  const base = pageMetadata(g.title, g.description, `/guides/${g.slug}`);
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
export default async function Guide({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = guides.find((g) => g.slug === slug);
  if (!g) notFound();
  const tool = getTool(g.tool)!;
  return (
    <main id="main" className="container article-page">
      <StructuredData
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
          { name: g.title, path: `/guides/${g.slug}` },
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
          inLanguage: 'en',
          image: `${siteUrl}/og?title=${encodeURIComponent(g.title)}`,
          mainEntityOfPage: `${siteUrl}/guides/${g.slug}`,
        }}
      />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/guides">Guides</Link>
        <ChevronRight size={13} />
        <span>{g.category}</span>
      </nav>
      <article>
        <header className="article-heading">
          <span className="eyebrow">
            {g.category} · {g.readTime}
          </span>
          <h1>{g.title}</h1>
          <p>{g.description}</p>
          <span className="article-date">
            <Link href="/about">Folio field notes</Link> · Updated{' '}
            <time dateTime={g.updated}>
              {new Date(`${g.updated}T00:00:00Z`).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </time>
          </span>
        </header>
        <div className="article-body">
          <nav className="article-contents" aria-label="On this page">
            <strong>On this page</strong>
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
              {section.links && (
                <ul className="article-next-links">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link prefetch={false} href={link.href}>
                        {link.label} <ArrowUpRight size={14} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <div className="article-cta">
            <span>Put a little clarity into practice.</span>
            <Link prefetch={false} className="button primary" href={`/${tool.slug}`}>
              Open {tool.name} <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </article>
      <div className="article-related">
        <h2>A little more reading.</h2>
        {relatedGuides(g).map((other) => (
          <Link key={other.slug} href={`/guides/${other.slug}`}>
            {other.title}
            <ArrowUpRight size={17} />
          </Link>
        ))}
      </div>
    </main>
  );
}

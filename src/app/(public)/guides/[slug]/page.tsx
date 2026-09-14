import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { guides } from '@/lib/guides';
import { getTool } from '@/lib/tools';
import { pageMetadata, breadcrumbSchema, siteUrl } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
export const dynamicParams = false;
export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = guides.find((g) => g.slug === slug);
  return g ? pageMetadata(g.title, g.description, `/guides/${g.slug}`) : {};
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
          datePublished: g.updated,
          dateModified: g.updated,
          author: { '@type': 'Organization', name: 'Folio', url: `${siteUrl}/about` },
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
          <span className="article-date">Folio field notes · Updated September 13, 2026</span>
        </header>
        <div className="article-body">
          {g.sections.map((section, i) => (
            <section key={section.title} id={`section-${i + 1}`}>
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </section>
          ))}
          <div className="article-cta">
            <span>Put a little clarity into practice.</span>
            <Link className="button primary" href={`/${tool.slug}`}>
              Open {tool.name} <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </article>
      <div className="article-related">
        <h2>A little more reading.</h2>
        {guides
          .filter((other) => other.slug !== g.slug)
          .slice(0, 2)
          .map((other) => (
            <Link key={other.slug} href={`/guides/${other.slug}`}>
              {other.title}
              <ArrowUpRight size={17} />
            </Link>
          ))}
      </div>
    </main>
  );
}

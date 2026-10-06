import { connection } from 'next/server';
import { translator, localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, ArrowUpRight } from 'lucide-react';
import { publicPostBySlug } from '@/lib/server/blog';
import { pageMetadata, siteUrl, breadcrumbSchema, organizationSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { RichContent } from '@/components/blog/rich-content';
import { BlogLike } from '@/components/blog/blog-like';
import { BlogCover } from '@/components/blog/blog-cover';
import { articleHeadings, articleToolSlugs } from '@/lib/article-navigation';
import { serverTools } from '@/lib/server/tool-catalog';
import { guidesForArticle } from '@/lib/related-content';
import s from '@/components/blog/blog.module.css';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({
  params,
  locale = 'en',
  messages = {},
}: Props & PageLanguage) {
  await connection();
  const tr = translator(messages);

  const { slug } = await params;
  const p = await publicPostBySlug(slug);
  if (!p) return { title: tr('Post not found'), robots: { index: false, follow: false } };
  const title = p.seoTitle || p.title,
    description = p.seoDescription || p.excerpt,
    base = pageMetadata(title, description, localizedHref(locale, `/blog/${p.slug}`));
  return {
    ...base,
    keywords: p.tags,
    authors: [{ name: p.author }],
    openGraph: {
      ...base.openGraph,
      type: 'article',
      publishedTime: p.publishedAt,
      modifiedTime: p.updatedAt,
      authors: [p.author],
      tags: p.tags,
      ...(p.cover ? { images: [{ url: p.cover, alt: p.coverAlt }] } : {}),
    },
    twitter: {
      ...base.twitter,
      ...(p.cover ? { images: [{ url: p.cover, alt: p.coverAlt }] } : {}),
    },
  };
}
export default async function BlogPost({
  params,
  locale = 'en',
  messages = {},
}: Props & PageLanguage) {
  await connection();
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);

  const { slug } = await params;
  const post = await publicPostBySlug(slug);
  if (!post) notFound();
  const contents = articleHeadings(post.content);
  const linkedTools = articleToolSlugs(post.content, siteUrl);
  const reading = guidesForArticle(post.slug, linkedTools);
  const related = serverTools()
    .filter((tool) => tool.available && linkedTools.includes(tool.slug))
    .slice(0, 3);
  return (
    <main id="main" className={`${s.article} with-page-heading`}>
      <StructuredData
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: post.title, path: `/blog/${post.slug}` },
        ])}
      />
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.excerpt,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          author: post.author.toLowerCase().startsWith('folio')
            ? { ...organizationSchema(), url: `${siteUrl}/about` }
            : { '@type': 'Person', name: post.author },
          publisher: organizationSchema(),
          inLanguage: 'en',
          image: post.cover || `${siteUrl}/og?title=${encodeURIComponent(post.title)}`,
          mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
          keywords: post.tags.join(', '),
        }}
      />

      <article>
        <header className={`${s.articleHero} page-heading page-heading--article`}>
          <Link className={`${s.back} page-heading-back`} href={href('/blog')}>
            <ArrowLeft size={16} />
            {tr('Back to the journal')}
          </Link>
          <Link
            className={`${s.eyebrow} eyebrow`}
            href={href(`/blog?category=${encodeURIComponent(post.category)}`)}
          >
            {post.category}
          </Link>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          <div className={s.byline}>
            <span className={s.authorAvatar}>{post.author.slice(0, 1)}</span>
            <div>
              <strong>
                {post.author.toLowerCase().startsWith('folio') ? (
                  <Link href={href('/about#editorial')}>{post.author}</Link>
                ) : (
                  post.author
                )}
              </strong>
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString(locale, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
              {post.updatedAt.slice(0, 10) !== post.publishedAt.slice(0, 10) && (
                <time dateTime={post.updatedAt}>
                  {tr('Updated')}{' '}
                  {new Date(post.updatedAt).toLocaleDateString(locale, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                </time>
              )}
            </div>
            <span>
              <Clock size={15} />
              {post.minutes} {tr('min read')}
            </span>
          </div>
        </header>
        {post.cover && (
          <figure className={s.articleCover}>
            <BlogCover src={post.cover} alt={post.coverAlt} hero />
          </figure>
        )}
        <div className={s.articleBody}>
          {contents.length > 1 && (
            <nav className="article-contents" aria-label={tr('On this page')}>
              <strong>{tr('On this page')}</strong>
              <ol>
                {contents.map((heading) => (
                  <li key={heading.id}>
                    <a href={`#${heading.id}`}>{heading.text}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <RichContent content={post.content} />
          {post.tags.length > 0 && (
            <div className={s.tags}>
              {post.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
          <BlogLike id={post.id} slug={post.slug} initialCount={post.likes} />
          {related.length > 0 && (
            <section className="tool-reading" aria-label={tr('Tools in this article')}>
              <h2>{tr('Try the tools in this article.')}</h2>
              <div className="tool-reading-grid">
                {related.map((tool) => (
                  <Link key={tool.slug} prefetch={false} href={href(`/${tool.slug}`)}>
                    <strong>
                      {tr(tool.name)} <ArrowUpRight size={16} aria-hidden="true" />
                    </strong>
                    <span>{tr(tool.description)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {reading.length > 0 && (
            <section className="tool-reading" aria-label={tr('A little more reading.')}>
              <h2>{tr('A little more reading.')}</h2>
              <div className="tool-reading-grid">
                {reading.map((guide) => (
                  <Link key={guide.slug} href={href(`/guides/${guide.slug}`)}>
                    <strong>
                      {tr(guide.title)} <ArrowUpRight size={16} aria-hidden="true" />
                    </strong>
                    <span>{tr(guide.description)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <div className={s.readingCta}>
            <div>
              <span className={`${s.eyebrow} eyebrow`}>{tr('PUT IT INTO PRACTICE')}</span>
              <h2>{tr('Your next document starts here.')}</h2>
            </div>
            <Link prefetch={false} className="button primary" href={href('/edit-pdf')}>
              {tr('Open the PDF editor')}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}

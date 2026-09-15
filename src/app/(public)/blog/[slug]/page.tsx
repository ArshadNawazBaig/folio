import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, ArrowUpRight } from 'lucide-react';
import { publicPostBySlug } from '@/lib/server/blog';
import { pageMetadata, siteUrl, breadcrumbSchema, organizationSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { RichContent } from '@/components/blog/rich-content';
import { BlogLike } from '@/components/blog/blog-like';
import s from '@/components/blog/blog.module.css';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const p = await publicPostBySlug(slug);
  if (!p) return { title: 'Post not found', robots: { index: false, follow: false } };
  const title = p.seoTitle || p.title,
    description = p.seoDescription || p.excerpt,
    base = pageMetadata(title, description, `/blog/${p.slug}`);
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
    twitter: { ...base.twitter, ...(p.cover ? { images: [p.cover] } : {}) },
  };
}
export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = await publicPostBySlug(slug);
  if (!post) notFound();
  return (
    <main id="main" className={s.article}>
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
      <Link className={s.back} href="/blog">
        <ArrowLeft size={16} />
        Back to the journal
      </Link>
      <article>
        <header className={s.articleHero}>
          <Link className={s.eyebrow} href={`/blog?category=${encodeURIComponent(post.category)}`}>
            {post.category}
          </Link>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          <div className={s.byline}>
            <span className={s.authorAvatar}>{post.author.slice(0, 1)}</span>
            <div>
              <strong>{post.author}</strong>
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </div>
            <span>
              <Clock size={15} />
              {post.minutes} min read
            </span>
          </div>
        </header>
        {post.cover && (
          <figure className={s.articleCover}>
            <img src={post.cover} alt={post.coverAlt} />
          </figure>
        )}
        <div className={s.articleBody}>
          <RichContent content={post.content} />
          {post.tags.length > 0 && (
            <div className={s.tags}>
              {post.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
          <BlogLike id={post.id} slug={post.slug} initialCount={post.likes} />
          <div className={s.readingCta}>
            <div>
              <span className={s.eyebrow}>PUT IT INTO PRACTICE</span>
              <h2>Your next document starts here.</h2>
            </div>
            <Link className="button primary" href="/workspace">
              Open the PDF editor
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}

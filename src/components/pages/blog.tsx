import { connection } from 'next/server';
import { translator, localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import Link from 'next/link';
import { Search, ArrowRight, BookOpen } from 'lucide-react';
import { publicPosts } from '@/lib/server/blog';
import { listingMetadata, breadcrumbSchema, collectionSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { Pagination } from '@/components/pagination';
import { PAGE_SIZE, pageCount } from '@/lib/pagination.mjs';
import { blogDirectory } from '@/lib/blog-directory';
import { type DirectoryParams } from '@/lib/tool-directory';
import { redirect } from 'next/navigation';
import { PostCard } from '@/components/blog/post-card';
import s from '@/components/blog/blog.module.css';
export const dynamic = 'force-dynamic';
type Props = {
  searchParams: Promise<DirectoryParams>;
};
export async function generateMetadata({
  searchParams,
  locale = 'en',
  messages = {},
}: Props & PageLanguage) {
  await connection();

  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);
  const d = blogDirectory(await searchParams);
  return listingMetadata(
    d.q
      ? tr('Search PDF articles: {query}', { query: d.q })
      : d.category
        ? tr('{category} — PDF Articles', { category: tr(d.category) })
        : 'PDF Tips & Tutorials — The Folio Blog',
    'Practical tutorials for editing PDF text, filling forms, merging files and reducing file size. Understand each workflow before you share your document.',
    href(d.canonical),
    d.page,
    d.index,
  );
}
export default async function Blog({
  searchParams,
  locale = 'en',
  messages = {},
}: Props & PageLanguage) {
  await connection();
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);

  const directory = blogDirectory(await searchParams);
  const { q, category, page, pageSize } = directory;
  const { posts, total, unavailable } = await publicPosts(page, q, category, pageSize);
  const filters = new URLSearchParams({
    ...(q ? { q } : {}),
    ...(category ? { category } : {}),
    ...(pageSize !== PAGE_SIZE ? { pageSize: String(pageSize) } : {}),
  });
  const paginationHref = href(`/blog${filters.size ? `?${filters}` : ''}`);
  if (!unavailable && page > pageCount(total, pageSize)) {
    const lastPage = pageCount(total, pageSize);
    if (lastPage > 1) filters.set('page', String(lastPage));
    redirect(href(`/blog${filters.size ? `?${filters}` : ''}`));
  }
  return (
    <main id="main" className={`${s.journal} with-page-heading`}>
      {!unavailable && (
        <StructuredData
          data={collectionSchema(
            'PDF tips and tutorials',
            directory.canonical,
            posts.map((post) => ({ name: post.title, path: `/blog/${post.slug}` })),
            (page - 1) * pageSize,
          )}
        />
      )}
      <StructuredData
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
        ])}
      />
      <header className={`${s.journalHero} page-heading`}>
        <span className={`${s.eyebrow} eyebrow`}>{tr('THE FOLIO JOURNAL')}</span>
        <h1>
          {tr('PDF tips.')}
          <br />
          <em>{tr('Better documents.')}</em>
        </h1>
        <p>
          {tr('A little know-how for your everyday paperwork.')}
          <br />
          {tr('Practical guides, fresh perspectives, and notes from Folio.')}
        </p>
      </header>
      <div className={s.journalBar}>
        <div>
          <span className={`${s.eyebrow} eyebrow`}>
            {q ? tr('SEARCH RESULTS') : category || tr('THE LATEST')}
          </span>
          <span>
            {total} {total === 1 ? tr('story') : tr('stories')}
          </span>
        </div>
        <form action={href('/blog')} className={s.search}>
          {pageSize !== PAGE_SIZE && <input type="hidden" name="pageSize" value={pageSize} />}
          {category && <input type="hidden" name="category" value={category} />}
          <Search size={17} />
          <input
            name="q"
            defaultValue={q}
            placeholder={tr('Find a good read…')}
            aria-label={tr('Search blog posts')}
            maxLength={120}
          />
          <button aria-label={tr('Search posts')}>
            <ArrowRight size={17} />
          </button>
        </form>
      </div>
      {unavailable ? (
        <div className={s.empty} role="alert">
          <BookOpen size={36} />
          <h2>{tr('The journal is taking a moment.')}</h2>
          <p>{tr('We couldn’t load the posts. Please try again shortly.')}</p>
          <Link className="button secondary" href={href('/blog')}>
            {tr('Try again')}
          </Link>
        </div>
      ) : posts.length ? (
        <div className={s.postGrid}>
          {posts.map((post, index) => (
            <PostCard
              locale={locale}
              messages={messages}
              post={post}
              key={post.id}
              eager={index === 0}
            />
          ))}
        </div>
      ) : (
        <div className={s.empty}>
          <BookOpen size={36} />
          <h2>{q || category ? tr('No stories found.') : tr('Good reads are on their way.')}</h2>
          <p>
            {q || category
              ? tr('Try another search or explore all our posts.')
              : tr('Our latest stories will appear here as soon as they’re published.')}
          </p>
          {(q || category || page > 1) && (
            <Link className="button secondary" href={href('/blog')}>
              {tr('View all posts')}
            </Link>
          )}
        </div>
      )}
      {!unavailable && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          href={paginationHref}
          label={tr('Blog pagination')}
        />
      )}
    </main>
  );
}

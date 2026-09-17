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
export async function generateMetadata({ searchParams }: Props) {
  const d = blogDirectory(await searchParams);
  return listingMetadata(
    d.q
      ? `Search PDF articles: ${d.q}`
      : d.category
        ? `${d.category} — PDF Articles`
        : 'PDF Tips & Tutorials — The Folio Blog',
    'Practical tutorials for editing PDF text, filling forms, merging files and reducing file size. Understand each workflow before you share your document.',
    d.canonical,
    d.page,
    d.index,
  );
}
export default async function Blog({ searchParams }: Props) {
  const directory = blogDirectory(await searchParams);
  const { q, category, page, pageSize } = directory;
  const { posts, total, unavailable } = await publicPosts(page, q, category, pageSize);
  const filters = new URLSearchParams({
    ...(q ? { q } : {}),
    ...(category ? { category } : {}),
    ...(pageSize !== PAGE_SIZE ? { pageSize: String(pageSize) } : {}),
  });
  const paginationHref = `/blog${filters.size ? `?${filters}` : ''}`;
  if (!unavailable && page > pageCount(total, pageSize)) {
    const lastPage = pageCount(total, pageSize);
    if (lastPage > 1) filters.set('page', String(lastPage));
    redirect(`/blog${filters.size ? `?${filters}` : ''}`);
  }
  return (
    <main id="main" className={s.journal}>
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
      <header className={s.journalHero}>
        <span className={s.eyebrow}>THE FOLIO JOURNAL</span>
        <h1>
          PDF tips.
          <br />
          <em>Better documents.</em>
        </h1>
        <p>
          A little know-how for your everyday paperwork.
          <br />
          Practical guides, fresh perspectives, and notes from Folio.
        </p>
      </header>
      <div className={s.journalBar}>
        <div>
          <span className={s.eyebrow}>{q ? 'SEARCH RESULTS' : category || 'THE LATEST'}</span>
          <span>
            {total} {total === 1 ? 'story' : 'stories'}
          </span>
        </div>
        <form action="/blog" className={s.search}>
          {pageSize !== PAGE_SIZE && <input type="hidden" name="pageSize" value={pageSize} />}
          {category && <input type="hidden" name="category" value={category} />}
          <Search size={17} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Find a good read…"
            aria-label="Search blog posts"
            maxLength={120}
          />
          <button aria-label="Search posts">
            <ArrowRight size={17} />
          </button>
        </form>
      </div>
      {unavailable ? (
        <div className={s.empty} role="alert">
          <BookOpen size={36} />
          <h2>The journal is taking a moment.</h2>
          <p>We couldn’t load the posts. Please try again shortly.</p>
          <Link className="button secondary" href="/blog">
            Try again
          </Link>
        </div>
      ) : posts.length ? (
        <div className={s.postGrid}>
          {posts.map((post, index) => (
            <PostCard post={post} key={post.id} eager={index === 0} />
          ))}
        </div>
      ) : (
        <div className={s.empty}>
          <BookOpen size={36} />
          <h2>{q || category ? 'No stories found.' : 'Good reads are on their way.'}</h2>
          <p>
            {q || category
              ? 'Try another search or explore all our posts.'
              : 'Our latest stories will appear here as soon as they’re published.'}
          </p>
          {(q || category || page > 1) && (
            <Link className="button secondary" href="/blog">
              View all posts
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
          label="Blog pagination"
        />
      )}
    </main>
  );
}

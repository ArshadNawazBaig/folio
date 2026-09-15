import Link from 'next/link';
import { Search, ArrowRight, BookOpen } from 'lucide-react';
import { publicPosts } from '@/lib/server/blog';
import { pageMetadata, breadcrumbSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { Pagination } from '@/components/pagination';
import { PAGE_SIZE, normalizePageSize, pageCount } from '@/lib/pagination.mjs';
import { redirect } from 'next/navigation';
import { PostCard } from '@/components/blog/post-card';
import s from '@/components/blog/blog.module.css';
export const dynamic = 'force-dynamic';
type Props = {
  searchParams: Promise<{ q?: string; page?: string; category?: string; pageSize?: string }>;
};
export async function generateMetadata({ searchParams }: Props) {
  const p = await searchParams;
  const canonical = new URLSearchParams();
  const page = Math.max(1, Math.min(10000, Number.parseInt(p.page || '1', 10) || 1));
  if (page > 1) canonical.set('page', String(page));
  const pageSize = normalizePageSize(p.pageSize);
  if (pageSize !== PAGE_SIZE) canonical.set('pageSize', String(pageSize));
  return pageMetadata(
    'The Folio blog — ideas for better documents',
    'Practical PDF tips, thoughtful workflows, and news from Folio. Read the latest from our editorial team.',
    canonical.size ? `/blog?${canonical}` : '/blog',
    !p.q && !p.category && pageSize === PAGE_SIZE,
  );
}
export default async function Blog({ searchParams }: Props) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.slice(0, 120) : '',
    category = typeof params.category === 'string' ? params.category.slice(0, 50) : '';
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page || '1', 10) || 1));
  const pageSize = normalizePageSize(params.pageSize);
  const { posts, total, unavailable } = await publicPosts(page, q, category, pageSize);
  const filters = new URLSearchParams({
    ...(q ? { q } : {}),
    ...(category ? { category } : {}),
    ...(pageSize !== PAGE_SIZE ? { pageSize: String(pageSize) } : {}),
  });
  const paginationHref = `/blog${filters.size ? `?${filters}` : ''}`;
  if (!unavailable && page > pageCount(total, pageSize)) {
    filters.set('page', String(pageCount(total, pageSize)));
    redirect(`/blog?${filters}`);
  }
  return (
    <main id="main" className={s.journal}>
      <StructuredData
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
        ])}
      />
      <header className={s.journalHero}>
        <span className={s.eyebrow}>THE FOLIO JOURNAL</span>
        <h1>
          Ideas worth
          <br />
          <em>keeping.</em>
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
          {posts.map((post) => (
            <PostCard post={post} key={post.id} />
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

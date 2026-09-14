import Link from 'next/link';
import { Search, ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { publicPosts } from '@/lib/server/blog';
import { pageMetadata, breadcrumbSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { PostCard } from '@/components/blog/post-card';
import s from '@/components/blog/blog.module.css';
export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<{ q?: string; page?: string; category?: string }> };
export async function generateMetadata({ searchParams }: Props) {
  const p = await searchParams;
  return pageMetadata(
    'The Folio blog — ideas for better documents',
    'Practical PDF tips, thoughtful workflows, and news from Folio. Read the latest from our editorial team.',
    p.page && p.page !== '1' ? `/blog?page=${encodeURIComponent(p.page)}` : '/blog',
    !p.q && !p.category,
  );
}
export default async function Blog({ searchParams }: Props) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.slice(0, 120) : '',
    category = typeof params.category === 'string' ? params.category.slice(0, 50) : '';
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page || '1', 10) || 1));
  const { posts, total, unavailable } = await publicPosts(page, q, category);
  const href = (n: number) =>
    `/blog?${new URLSearchParams({ ...(q ? { q } : {}), ...(category ? { category } : {}), page: String(n) })}`;
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
      {(page > 1 || total > page * 12) && (
        <nav className={s.pagination} aria-label="Blog pagination">
          {page > 1 ? (
            <Link href={href(page - 1)}>
              <ArrowLeft size={16} />
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span>
            Page {page} of {Math.max(page, Math.ceil(total / 12))}
          </span>
          {total > page * 12 ? (
            <Link href={href(page + 1)}>
              Next
              <ArrowRight size={16} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}

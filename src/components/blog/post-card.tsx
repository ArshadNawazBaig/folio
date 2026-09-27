import Link from 'next/link';
import { ArrowUpRight, Clock3, Heart, FileText } from 'lucide-react';
import type { PublicPost } from '@/lib/blog';
import s from './blog.module.css';
import { BlogCover } from './blog-cover';
export function PostCard({ post, eager = false }: { post: PublicPost; eager?: boolean }) {
  const titleId = `post-${post.id}-title`;
  return (
    <article className={s.postCard}>
      <Link href={`/blog/${post.slug}`} className={s.cardLink} aria-labelledby={titleId}>
        <div className={s.cardCover}>
          {post.cover ? (
            <BlogCover src={post.cover} alt="" eager={eager} />
          ) : (
            <div className={s.coverPlaceholder} aria-hidden="true">
              <FileText size={44} strokeWidth={1.25} />
              <span>Folio field notes</span>
            </div>
          )}
          {post.featured && <span className={s.featured}>EDITOR’S PICK</span>}
        </div>
        <div className={s.cardBody}>
          <div className={s.cardDetails}>
            <span className={s.category}>{post.category}</span>
            <span className={s.readingTime}>
              <Clock3 size={14} aria-hidden="true" /> {post.minutes} min read
            </span>
          </div>
          <h2 id={titleId}>{post.title}</h2>
          <p className={s.excerpt}>{post.excerpt}</p>
          <div className={s.cardMeta}>
            <div className={s.cardByline}>
              <strong>{post.author}</strong>
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
              </time>
            </div>
            <span className={s.cardLikes}>
              <Heart size={14} aria-hidden="true" />
              {post.likes}
              <span className="sr-only">{post.likes === 1 ? ' like' : ' likes'}</span>
            </span>
            <span className={s.cardArrow} aria-hidden="true">
              <ArrowUpRight size={19} />
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

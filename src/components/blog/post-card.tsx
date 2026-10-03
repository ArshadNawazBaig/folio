import { translator, localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import Link from 'next/link';
import { ArrowUpRight, Clock3, Heart, FileText } from 'lucide-react';
import type { PublicPost } from '@/lib/blog';
import s from './blog.module.css';
import { BlogCover } from './blog-cover';
export function PostCard({
  post,
  eager = false,
  locale = 'en',
  messages = {},
}: { post: PublicPost; eager?: boolean } & PageLanguage) {
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);
  const titleId = `post-${post.id}-title`;
  return (
    <article className={s.postCard}>
      <Link href={href(`/blog/${post.slug}`)} className={s.cardLink} aria-labelledby={titleId}>
        <div className={s.cardCover}>
          {post.cover ? (
            <BlogCover src={post.cover} alt="" eager={eager} />
          ) : (
            <div className={s.coverPlaceholder} aria-hidden="true">
              <FileText size={44} strokeWidth={1.25} />
              <span>{tr('Folio field notes')}</span>
            </div>
          )}
          {post.featured && <span className={s.featured}>{tr('EDITOR’S PICK')}</span>}
        </div>
        <div className={s.cardBody}>
          <div className={s.cardDetails}>
            <span className={s.category}>{post.category}</span>
            <span className={s.readingTime}>
              <Clock3 size={14} aria-hidden="true" />{' '}
              {tr('{minutes} min read', { minutes: post.minutes })}
            </span>
          </div>
          <h2 id={titleId}>{post.title}</h2>
          <p className={s.excerpt}>{post.excerpt}</p>
          <div className={s.cardMeta}>
            <div className={s.cardByline}>
              <strong>{post.author}</strong>
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString(locale, {
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
              <span className="sr-only">{post.likes === 1 ? tr(' like') : tr(' likes')}</span>
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

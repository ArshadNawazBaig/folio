import Link from 'next/link';
import { ArrowUpRight, Heart, FileText } from 'lucide-react';
import type { PublicPost } from '@/lib/blog';
import s from './blog.module.css';
import { BlogCover } from './blog-cover';
export function PostCard({ post, eager = false }: { post: PublicPost; eager?: boolean }) {
  return (
    <article className={s.postCard}>
      <Link href={`/blog/${post.slug}`} className={s.coverLink} tabIndex={-1} aria-hidden="true">
        {post.cover ? (
          <BlogCover src={post.cover} alt="" eager={eager} />
        ) : (
          <div className={s.coverPlaceholder}>
            <FileText size={54} strokeWidth={1} />
            <span>Folio field notes</span>
          </div>
        )}
        {post.featured && <span className={s.featured}>EDITOR’S PICK</span>}
      </Link>
      <div className={s.cardBody}>
        <span className={s.eyebrow}>
          {post.category} <span>· {post.minutes} min read</span>
        </span>
        <h2>
          <Link href={`/blog/${post.slug}`}>
            {post.title}
            <ArrowUpRight size={20} />
          </Link>
        </h2>
        <p>{post.excerpt}</p>
        <div className={s.cardMeta}>
          <span>{post.author}</span>
          <span>
            <Heart size={13} />
            {post.likes}
          </span>
        </div>
      </div>
    </article>
  );
}

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { articleAuthor, articleAuthorName } from '@/lib/article-author';
import { localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import s from './article-author.module.css';

export function AuthorAvatar({ name = articleAuthor.name }: { name?: string }) {
  return articleAuthorName(name) === articleAuthor.name ? (
    <Image
      className={s.avatar}
      src={articleAuthor.image}
      alt={articleAuthor.name}
      width={40}
      height={40}
      sizes="40px"
    />
  ) : (
    <span className={s.avatar} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
}

export function ArticleAuthor({
  name = articleAuthor.name,
  locale = 'en',
  children,
}: { name?: string; children?: ReactNode } & Pick<PageLanguage, 'locale'>) {
  const author = articleAuthorName(name);
  const owner = author === articleAuthor.name;
  return (
    <div className={s.byline}>
      <AuthorAvatar name={author} />
      <div className={s.details}>
        <strong className={s.name}>
          {owner ? (
            <Link rel="author" href={localizedHref(locale, articleAuthor.profilePath)}>
              {author}
            </Link>
          ) : (
            author
          )}
        </strong>
        {owner && (
          <a className={s.email} href={`mailto:${articleAuthor.email}`}>
            {articleAuthor.email}
          </a>
        )}
        {children}
      </div>
    </div>
  );
}

import { PAGE_SIZE } from '@/lib/pagination.mjs';
import { Skeleton, LoadingLabel } from '@/components/skeleton';
import s from '@/components/blog/blog.module.css';
export default function Loading() {
  return (
    <main id="main" className={s.journal} aria-busy="true">
      <LoadingLabel>Loading the journal…</LoadingLabel>
      <header className={s.journalHero}>
        <Skeleton width={150} height={10} />
        <h1>
          <Skeleton width="45%" height={76} />
        </h1>
        <p>
          <Skeleton width="60%" height={14} />
        </p>
      </header>
      <div className={s.journalBar}>
        <Skeleton width={100} height={18} />
        <Skeleton width={300} height={44} radius={30} />
      </div>
      <div className={s.postGrid}>
        {Array.from({ length: PAGE_SIZE }, (_, i) => (
          <article key={i} className={s.postCard}>
            <Skeleton height={220} />
            <div className={s.cardBody}>
              <Skeleton width="50%" height={10} />
              <h2>
                <Skeleton height={60} />
              </h2>
              <p>
                <Skeleton height={36} />
              </p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

import { PAGE_SIZE } from '@/lib/pagination.mjs';
import { Skeleton, LoadingLabel } from '@/components/skeleton';
import s from '@/components/blog/blog.module.css';
export default function Loading() {
  return (
    <main id="main" className={`${s.journal} with-page-heading`} aria-busy="true">
      <LoadingLabel>Loading the journal…</LoadingLabel>
      <header className={`${s.journalHero} page-heading`}>
        <Skeleton width={150} height={10} />
        <div className={s.heroPlaceholder} aria-hidden="true">
          <Skeleton width="45%" height={76} />
        </div>
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
            <div className={s.cardCover}>
              <Skeleton height="100%" />
            </div>
            <div className={s.cardBody}>
              <div className={s.cardDetails}>
                <Skeleton width={105} height={27} radius={5} />
                <Skeleton width={85} height={13} />
              </div>
              <h2>
                <Skeleton height={60} />
              </h2>
              <p>
                <Skeleton height={78} />
              </p>
              <div className={s.cardMeta}>
                <div className={s.cardByline}>
                  <Skeleton width={110} height={13} />
                  <Skeleton width={85} height={12} />
                </div>
                <Skeleton width={30} height={13} />
                <Skeleton width={36} height={36} radius="50%" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

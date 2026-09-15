import { PAGE_SIZE } from '@/lib/pagination.mjs';
import type { CSSProperties, ReactNode } from 'react';
import s from './skeleton.module.css';

export function Skeleton({
  width = '100%',
  height = '0.85em',
  radius,
  className = '',
}: {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  radius?: CSSProperties['borderRadius'];
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-skeleton=""
      className={`${s.shape} ${className}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

export function LoadingLabel({ children }: { children: ReactNode }) {
  return (
    <span className="sr-only" role="status">
      {children}
    </span>
  );
}

export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  return (
    <span className={s.lines} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '68%' : '100%'} />
      ))}
    </span>
  );
}

export function SignInSkeleton({ description = false }: { description?: boolean }) {
  return (
    <div className="sign-in-form" aria-busy="true">
      <LoadingLabel>Checking your account…</LoadingLabel>
      {description && (
        <p>
          <SkeletonLines lines={2} />
        </p>
      )}
      <Skeleton height={46} radius={6} />
      <div className="sign-in-divider">
        <Skeleton width={100} height={10} />
      </div>
      <div className={s.signInFields}>
        <Skeleton width={82} height={11} />
        <Skeleton height={43} radius={7} />
        <Skeleton height={44} radius={7} />
      </div>
      <small>
        <Skeleton width="86%" height={10} />
      </small>
    </div>
  );
}

export function TicketListSkeleton({ count = PAGE_SIZE }: { count?: number }) {
  return (
    <div className="admin-ticket-list" aria-busy="true">
      <LoadingLabel>Loading conversations…</LoadingLabel>
      {Array.from({ length: count }, (_, i) => (
        <div className={s.ticket} key={i} aria-hidden="true">
          <strong>
            <Skeleton width={i === 1 ? '62%' : '82%'} height={12} />
          </strong>
          <small>
            <Skeleton width="45%" height={10} />
          </small>
        </div>
      ))}
    </div>
  );
}

export function ThreadSkeleton({ count = PAGE_SIZE }: { count?: number }) {
  return (
    <div className="support-thread" aria-busy="true">
      <LoadingLabel>Loading conversation…</LoadingLabel>
      {Array.from({ length: count }, (_, i) => (
        <article key={i} className={i ? 'staff' : ''} aria-hidden="true">
          <strong>
            <Skeleton width={90} height={11} />
          </strong>
          <p>
            <SkeletonLines lines={i ? 2 : 3} />
          </p>
          <small>
            <Skeleton width={125} height={10} />
          </small>
        </article>
      ))}
    </div>
  );
}

export function AdminTableSkeleton({
  columns = 5,
  count = PAGE_SIZE,
}: {
  columns?: number;
  count?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, row) => (
        <tr key={row} aria-hidden="true" className={s.tableRow}>
          {Array.from({ length: columns }, (_, col) => (
            <td key={col}>
              {col === 0 ? (
                <>
                  <strong>
                    <Skeleton width="82%" height={12} />
                  </strong>
                  <small>
                    <Skeleton width="95%" height={10} />
                  </small>
                </>
              ) : col === 2 ? (
                <Skeleton width={62} height={25} radius={5} />
              ) : col === columns - 1 ? (
                <span className="admin-row-actions">
                  <Skeleton width={48} height={12} />
                  <Skeleton width={57} height={12} />
                </span>
              ) : (
                <Skeleton width={72} height={11} />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function AuditSkeleton({ count = PAGE_SIZE }: { count?: number }) {
  return (
    <div aria-busy="true">
      <LoadingLabel>Loading activity…</LoadingLabel>
      <ul className="admin-audit-list">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} aria-hidden="true">
            <Skeleton width={17} height={17} />
            <div className={s.auditText}>
              <strong>
                <Skeleton width="40%" height={12} />
              </strong>
              <p>
                <Skeleton width="72%" height={11} />
              </p>
              <small>
                <Skeleton width="56%" height={10} />
              </small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

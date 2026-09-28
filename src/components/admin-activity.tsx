'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  ChevronDown,
  Clock3,
  CreditCard,
  History,
  Inbox,
  Newspaper,
  Settings,
  Tag,
  UserRound,
} from 'lucide-react';
import type { AuditEntry } from '@/lib/platform';
import { PAGE_SIZE } from '@/lib/pagination.mjs';
import {
  activityActor,
  activityDay,
  activityDetail,
  activityLabel,
  activityPresentation,
} from '@/lib/admin-activity';
import { AuditSkeleton } from './skeleton';
import s from './admin-activity.module.css';

const icons = {
  Blog: Newspaper,
  Settings,
  Pricing: Tag,
  Account: UserRound,
  Support: Inbox,
  Subscription: CreditCard,
  Other: History,
};

export function AdminActivity({
  rows,
  loading = false,
  count = PAGE_SIZE,
  currentUserId,
}: {
  rows: AuditEntry[];
  loading?: boolean;
  count?: number;
  currentUserId?: string;
}) {
  const groups = new Map<string, AuditEntry[]>();
  for (const row of rows) {
    const day = activityDay(row.created_at);
    groups.set(day, [...(groups.get(day) || []), row]);
  }
  return (
    <section className={`admin-card ${s.card}`} aria-label="Recorded activity">
      <div className={s.header}>
        <div>
          <h2>Recorded activity</h2>
          <p>Blog, account, billing, support, and site changes in one place.</p>
        </div>
        <span className={s.order}>
          <Clock3 size={15} aria-hidden="true" /> Newest first · Local time
        </span>
      </div>
      {loading ? (
        <AuditSkeleton count={count} />
      ) : rows.length ? (
        [...groups].map(([day, entries]) => (
          <div className={s.day} key={day}>
            <h3 className={s.date}>
              {day}
              <span>
                {entries.length} {entries.length === 1 ? 'event' : 'events'}
                <span className="sr-only"> on this page</span>
              </span>
            </h3>
            <ul className={s.list}>
              {entries.map((row) => (
                <ActivityRow key={row.id} row={row} currentUserId={currentUserId} />
              ))}
            </ul>
          </div>
        ))
      ) : (
        <div className={s.empty}>
          <History size={26} aria-hidden="true" />
          <h3>No activity yet</h3>
          <p>Recorded changes will appear here, with who made them and when.</p>
        </div>
      )}
    </section>
  );
}

function ActivityRow({ row, currentUserId }: { row: AuditEntry; currentUserId?: string }) {
  const activity = activityPresentation(row);
  const Icon = icons[activity.category as keyof typeof icons] || History;
  const date = new Date(row.created_at);
  const validDate = !Number.isNaN(date.getTime());
  const detail = row.detail || {};
  const fields = Object.entries(detail).filter(([key]) => key !== 'fingerprint' && key !== 'title');
  return (
    <li className={s.row}>
      <span className={s.icon} aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className={s.content}>
        <div className={s.rowHeader}>
          <div className={s.labels}>
            <span className={s.category}>{activity.category}</span>
            <span className={s.badge} data-tone={activity.tone}>
              {activity.label}
            </span>
          </div>
          <time
            dateTime={validDate ? row.created_at : undefined}
            title={
              validDate
                ? date.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' })
                : undefined
            }
          >
            {validDate
              ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
              : 'Time unavailable'}
          </time>
        </div>
        <h4 className={s.title}>
          {activity.href ? (
            <Link href={activity.href} prefetch={false}>
              <span>{activity.title}</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          ) : (
            activity.title
          )}
        </h4>
        <details className={s.details}>
          <summary>
            <span className={s.actor}>
              <UserRound size={13} aria-hidden="true" />{' '}
              {activityActor(row.actor_id, currentUserId)}
            </span>
            <span className={s.disclosure}>
              Change details <ChevronDown size={14} aria-hidden="true" />
            </span>
          </summary>
          <div className={s.detailBody}>
            {fields.length > 0 && (
              <dl className={s.fields}>
                {fields.map(([key, value]) => (
                  <div key={key}>
                    <dt>{activityLabel(key)}</dt>
                    <dd>{activityDetail(key, value, detail)}</dd>
                  </div>
                ))}
              </dl>
            )}
            <dl className={`${s.fields} ${s.identifiers}`}>
              <div>
                <dt>Recorded at</dt>
                <dd>
                  {validDate
                    ? date.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' })
                    : row.created_at}
                </dd>
              </div>
              <div>
                <dt>Record ID</dt>
                <dd>
                  <code>{row.id}</code>
                </dd>
              </div>
              <div>
                <dt>Target ID</dt>
                <dd>
                  <code>{row.target || 'Not recorded'}</code>
                </dd>
              </div>
              <div>
                <dt>Actor ID</dt>
                <dd>
                  <code>{row.actor_id || 'Not recorded'}</code>
                </dd>
              </div>
              <div>
                <dt>Action</dt>
                <dd>
                  <code>{row.action}</code>
                </dd>
              </div>
            </dl>
            <details className={s.raw}>
              <summary>
                Original data <ChevronDown size={14} aria-hidden="true" />
              </summary>
              <pre>{JSON.stringify(detail, null, 2)}</pre>
            </details>
          </div>
        </details>
      </div>
    </li>
  );
}

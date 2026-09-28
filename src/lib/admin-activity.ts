import { money, type AuditEntry } from './platform';

const actions: Record<string, [string, string, 'neutral' | 'positive' | 'caution']> = {
  'blog.create': ['Blog', 'Draft created', 'neutral'],
  'blog.publish': ['Blog', 'Published', 'positive'],
  'blog.unpublish': ['Blog', 'Unpublished', 'caution'],
  'blog.trash': ['Blog', 'Moved to trash', 'caution'],
  'blog.restore': ['Blog', 'Restored to drafts', 'neutral'],
  'settings.update': ['Settings', 'Updated', 'neutral'],
  'pricing.publish': ['Pricing', 'Published', 'positive'],
  'support.update': ['Support', 'Updated', 'neutral'],
  suspend: ['Account', 'Suspended', 'caution'],
  restore: ['Account', 'Restored', 'positive'],
  grant: ['Account', 'Access granted', 'positive'],
  revoke_grant: ['Account', 'Access revoked', 'caution'],
  'user.delete': ['Account', 'Deleted', 'caution'],
};

export function activityLabel(value: string) {
  const label = value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_.-]+/g, ' ')
    .trim();
  return label ? label[0].toUpperCase() + label.slice(1) : 'Activity';
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function activityPresentation(row: AuditEntry) {
  const detail = row.detail || {};
  const requested = row.action === 'pricing.request' || row.action === 'subscription.request';
  const [category, label, tone] = requested
    ? [
        row.action.startsWith('pricing.') ? 'Pricing' : 'Subscription',
        detail.completed === true ? 'Request completed' : 'Requested',
        detail.completed === true ? 'positive' : 'neutral',
      ]
    : Object.hasOwn(actions, row.action)
      ? actions[row.action]
      : ['Other', activityLabel(row.action), 'neutral'];
  const title =
    text(detail.title) ||
    text(detail.name) ||
    (category === 'Blog'
      ? 'Blog article'
      : category === 'Settings'
        ? 'Site settings'
        : category === 'Pricing'
          ? 'Pricing configuration'
          : category === 'Account'
            ? `User account${row.target ? ` · ${row.target.slice(0, 8)}` : ''}`
            : category === 'Support'
              ? `Support ticket${row.target ? ` · ${row.target.slice(0, 8)}` : ''}`
              : category === 'Subscription'
                ? `Subscription ${row.target}`.trim()
                : row.target || 'Administrative change');
  return {
    category,
    label,
    tone,
    title,
    href:
      category === 'Blog' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.target)
        ? `/admin/blog/${row.target}`
        : undefined,
  };
}

export function activityActor(actorId: string | null, currentUserId?: string) {
  return !actorId
    ? 'Actor not recorded'
    : actorId === currentUserId
      ? 'You'
      : `Admin ${actorId.slice(0, 8)}`;
}

export function activityDetail(key: string, value: unknown, detail: AuditEntry['detail']) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return 'Not set';
  if (
    ['monthlyAmount', 'trialAmount'].includes(key) &&
    typeof value === 'number' &&
    detail.currency === 'usd'
  )
    return `${money(value)} USD`;
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function activityDay(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

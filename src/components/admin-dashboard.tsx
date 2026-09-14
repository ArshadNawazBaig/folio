'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Tag,
  Settings,
  Inbox,
  History,
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
  X,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { Logo } from './logo';
import { Dropdown } from './dropdown';
import { SignInForm } from './sign-in-form';
import { useAccount } from './account-provider';
import { accountFetch, authClient } from '@/lib/auth-client';
import {
  DEFAULT_CATALOG,
  DEFAULT_SETTINGS,
  money,
  pricingSchema,
  type PricingCatalog,
  type PricingValues,
  type SiteSettings,
  type AdminSection,
  type AdminUser,
  type AdminSubscription,
  type AdminOverview,
  type AuditEntry,
  type SupportTicket,
  type SupportMessage,
} from '@/lib/platform';
import type { AdminAction } from '@/lib/admin-actions';
import {
  Skeleton,
  LoadingLabel,
  AdminTableSkeleton,
  AuditSkeleton,
  TicketListSkeleton,
  ThreadSkeleton,
} from './skeleton';

const navigation = [
  ['overview', 'Overview', LayoutDashboard],
  ['users', 'Users', Users],
  ['subscriptions', 'Subscriptions', CreditCard],
  ['pricing', 'Pricing plans', Tag],
  ['support', 'Support inbox', Inbox],
  ['settings', 'Site settings', Settings],
  ['audit', 'Activity log', History],
] as const;
type Snapshot = {
  catalog: PricingCatalog;
  settings: SiteSettings;
  stripeReady: boolean;
  userDeletionReady?: boolean;
  overview?: AdminOverview;
  users?: { rows: AdminUser[]; total: number };
  subscriptions?: { rows: AdminSubscription[]; total: number };
  tickets?: { rows: SupportTicket[]; total: number };
  messages?: SupportMessage[];
  audit?: AuditEntry[];
  priceHistory?: {
    id: string;
    name: string;
    monthly_amount: number;
    trial_amount: number;
    trial_days: number;
    created_at: string;
  }[];
};
const empty: Snapshot = {
  catalog: DEFAULT_CATALOG,
  settings: DEFAULT_SETTINGS,
  stripeReady: false,
};
const date = (value: string | null) => (value ? new Date(value).toLocaleDateString() : '—');
export function AdminDashboard() {
  const { user, configured, loading: accountLoading } = useAccount();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [section, setSection] = useState<AdminSection>('overview'),
    [data, setData] = useState<Snapshot>(empty),
    [authorized, setAuthorized] = useState(false),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [ticket, setTicket] = useState<SupportTicket | null>(null),
    [ticketFilter, setTicketFilter] = useState('all'),
    [reply, setReply] = useState(''),
    [status, setStatus] = useState('open'),
    [priority, setPriority] = useState('normal');
  const [pricing, setPricing] = useState<PricingValues>(DEFAULT_CATALOG),
    [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS),
    [pending, setPending] = useState<AdminAction | null>(null),
    [reason, setReason] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [loadedKey, setLoadedKey] = useState('');
  const queryKey = [user?.id, section, search, page, ticketFilter, ticket?.id].join('|');
  const modal = useRef<HTMLDialogElement>(null),
    generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    if (!user) {
      setData(empty);
      setAuthorized(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        view: section,
        q: search,
        page: String(page),
        status: ticketFilter,
      });
      if (ticket) params.set('ticket', ticket.id);
      const result = await (await accountFetch(`/api/admin?${params}`)).json();
      if (current !== generation.current) return;
      setData(result);
      setLoadedKey(queryKey);
      setAuthorized(true);
      setSettings(result.settings);
      const c = result.catalog;
      setPricing({
        name: c.name,
        currency: c.currency,
        monthlyAmount: c.monthlyAmount,
        trialAmount: c.trialAmount,
        trialDays: c.trialDays,
        trialEnabled: c.trialEnabled,
      });
    } catch (e) {
      if (current === generation.current) {
        setAuthorized(false);
        setError(e instanceof Error ? e.message : 'The dashboard could not be loaded.');
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [user, section, search, page, ticket, ticketFilter, queryKey]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => {
      clearTimeout(timer);
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- Invalidate in-flight requests; this ref is a generation counter, not a DOM node.
      generation.current++;
    };
  }, [load]);
  const reviewOpen = !!pending;
  useEffect(() => {
    if (reviewOpen) {
      setReason('');
      setDeleteConfirmation('');
      setError('');
      modal.current?.showModal();
    } else modal.current?.close();
  }, [reviewOpen]);
  useEffect(() => {
    setData(empty);
    setAuthorized(false);
  }, [user?.id]);
  function navigate(next: AdminSection) {
    setSection(next);
    setPage(1);
    setSearch('');
    setTicket(null);
    setNotice('');
  }
  async function save(action: AdminAction) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await accountFetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      });
      setPending(null);
      setReply('');
      setNotice(
        action.action === 'delete_user'
          ? 'The user and their app data have been permanently deleted.'
          : action.action === 'user' && action.operation === 'restore'
            ? 'The user is active and can access their account again.'
            : 'Saved. The change has been recorded in the activity log.',
      );
      await load();
    } catch (e) {
      // A failed deletion can already have suspended the account. Refresh the
      // row so activation stays disabled and the retry action reflects that.
      if (action.action === 'delete_user') await load();
      setError(e instanceof Error ? e.message : 'The change could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    if (signingOut || busy) return;
    setSigningOut(true);
    setError('');
    try {
      const client = authClient();
      if (!client) throw new Error('Accounts are not connected.');
      const result = await client.auth.signOut({ scope: 'local' });
      if (result.error) throw result.error;
      generation.current++;
      setAuthorized(false);
      setData(empty);
      setPending(null);
      setTicket(null);
      setReply('');
      setSettings(DEFAULT_SETTINGS);
      setPricing(DEFAULT_CATALOG);
      router.replace('/account');
    } catch {
      setError('Sign-out could not finish. Please try again.');
      setSigningOut(false);
    }
  }
  const dataPending = (accountLoading && !user) || (!!user && loadedKey !== queryKey && !error);
  const enabled = authorized && !busy && !loading && !signingOut && !dataPending;
  const total =
    section === 'users'
      ? data.users?.total || 0
      : section === 'subscriptions'
        ? data.subscriptions?.total || 0
        : data.tickets?.total || 0;
  const title = navigation.find((item) => item[0] === section)![1];
  const actionTitle =
    pending?.action === 'delete_user'
      ? 'Permanently delete this user?'
      : pending?.action === 'pricing'
        ? 'Publish new pricing?'
        : pending?.action === 'subscription'
          ? 'Change this subscription?'
          : pending?.action === 'user'
            ? pending.operation === 'restore'
              ? 'Activate this user?'
              : 'Update this user’s access?'
            : 'Save site settings?';
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Logo />
        <span className="admin-label">
          <ShieldCheck size={13} /> SUPER ADMIN
        </span>
        <nav aria-label="Admin navigation">
          {navigation.map(([key, label, Icon]) => (
            <button
              key={key}
              aria-current={section === key ? 'page' : undefined}
              onClick={() => navigate(key)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <Link className="admin-back" href="/">
          Open website <ArrowUpRight size={16} />
        </Link>
        <Link className="admin-back" href="/account">
          Your account <ArrowUpRight size={16} />
        </Link>
      </aside>
      <main id="main" className="admin-main" data-skeleton-loading={dataPending || undefined}>
        {dataPending && (
          <LoadingLabel>
            Loading {section === 'overview' ? 'dashboard' : title.toLowerCase()}…
          </LoadingLabel>
        )}
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">FOLIO CONTROL ROOM</span>
            <h1>{title}</h1>
          </div>
          <div className="admin-topbar-actions">
            <button
              className="button secondary"
              onClick={() => void load()}
              disabled={!user || loading || busy || signingOut}
            >
              <RefreshCw size={15} />
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            {user && (
              <button
                className="button secondary"
                disabled={signingOut || busy}
                onClick={() => void signOut()}
              >
                <LogOut size={15} />
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            )}
          </div>
        </header>
        {!configured && (
          <div className="admin-setup" role="status">
            <ShieldCheck size={22} />
            <div>
              <strong>Dashboard preview. Live administration is not connected yet.</strong>
              <p>
                Connect Supabase, apply the platform migrations, and assign your account to{' '}
                <code>super_admins</code> in the database. Then sign in to manage real data. No
                default admin password is created.
              </p>
              <details>
                <summary>First admin setup</summary>
                <p>
                  Sign in once at Account, then run this in your Supabase SQL editor with your own
                  email:
                </p>
                <pre>
                  {
                    "insert into public.super_admins(user_id)\nselect id from auth.users\nwhere lower(email) = lower('YOUR_ADMIN_EMAIL');"
                  }
                </pre>
                <p>
                  Apply migrations 001, 002, and 003 in order. Keep the service role and Stripe keys
                  on the server.
                </p>
              </details>
            </div>
          </div>
        )}
        {!user && !accountLoading && (
          <div className="admin-setup admin-sign-in">
            <ShieldCheck size={22} />
            <div>
              <strong>Sign in with your super admin account.</strong>
              <p>Only accounts explicitly assigned in the database can access this dashboard.</p>
              <SignInForm destination="/admin" />
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="error-message">
            <AlertCircle size={16} />
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="pro-notice">
            <Check size={16} />
            {notice}
          </p>
        )}
        {section === 'overview' && (
          <>
            <div className="admin-metrics">
              {[
                ['Total users', data.overview?.users, Users],
                ['Paid subscriptions', data.overview?.paid, CreditCard],
                ['Paid trials', data.overview?.trials, Tag],
                ['Open inquiries', data.overview?.openTickets, Inbox],
                ['Download requests today', data.overview?.operations, LayoutDashboard],
                ['Suspended users', data.overview?.suspended, ShieldCheck],
              ].map(([label, value, Icon]) => {
                const MetricIcon = Icon as typeof Users;
                return (
                  <article key={String(label)}>
                    <span>
                      <MetricIcon size={18} />
                      {String(label)}
                    </span>
                    <strong>
                      {dataPending ? (
                        <Skeleton width={72} height={34} />
                      ) : typeof value === 'number' ? (
                        value.toLocaleString()
                      ) : (
                        '—'
                      )}
                    </strong>
                  </article>
                );
              })}
            </div>
            <div className="admin-overview-grid">
              <section className="admin-card">
                <h2>Everything has a place.</h2>
                <p>Manage the customer experience from first edit to finished download.</p>
                <div className="admin-shortcuts">
                  <button onClick={() => navigate('pricing')}>
                    Review pricing <ArrowUpRight size={16} />
                  </button>
                  <button onClick={() => navigate('support')}>
                    Open support inbox <ArrowUpRight size={16} />
                  </button>
                  <button onClick={() => navigate('settings')}>
                    Site availability <ArrowUpRight size={16} />
                  </button>
                </div>
              </section>
              <section className="admin-card">
                <h2>Service status</h2>
                <ul className="admin-status-list">
                  <li>
                    Accounts & database{' '}
                    <span>
                      {dataPending ? (
                        <Skeleton width={94} height={11} />
                      ) : authorized ? (
                        'Connected'
                      ) : (
                        'Awaiting setup'
                      )}
                    </span>
                  </li>
                  <li>
                    Stripe billing{' '}
                    <span>
                      {dataPending ? (
                        <Skeleton width={94} height={11} />
                      ) : data.stripeReady ? (
                        'Configured'
                      ) : (
                        'Awaiting setup'
                      )}
                    </span>
                  </li>
                  <li>
                    Website{' '}
                    <span>
                      {dataPending ? (
                        <Skeleton width={60} height={11} />
                      ) : data.settings.maintenance ? (
                        'Maintenance'
                      ) : (
                        'Open'
                      )}
                    </span>
                  </li>
                  <li>
                    New purchases{' '}
                    <span>
                      {dataPending ? (
                        <Skeleton width={130} height={11} />
                      ) : data.settings.purchasesEnabled ? (
                        'Enabled when billing is ready'
                      ) : (
                        'Paused'
                      )}
                    </span>
                  </li>
                </ul>
                <small>Integration configuration does not confirm a completed live payment.</small>
              </section>
            </div>
            <AuditList rows={data.audit || []} loading={dataPending} />
          </>
        )}
        {(section === 'users' || section === 'subscriptions') && (
          <section className="admin-card">
            <div className="admin-table-top">
              <div>
                <h2>{section === 'users' ? 'People using Folio' : 'Subscription directory'}</h2>
                <p>
                  {dataPending ? (
                    <Skeleton width={95} height={12} />
                  ) : authorized ? (
                    `${total.toLocaleString()} records`
                  ) : (
                    'Live records appear after admin sign-in.'
                  )}
                </p>
              </div>
              <label className="admin-search">
                <Search size={16} />
                <input
                  aria-label={section === 'users' ? 'Search users' : 'Search subscriptions'}
                  placeholder="Search email or ID…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </label>
            </div>
            {section === 'users' && authorized && !dataPending && !data.userDeletionReady && (
              <p className="service-note">
                To enable permanent user deletion, apply migration 007_admin_user_deletion.sql in
                your Supabase SQL Editor, then refresh this list.
              </p>
            )}
            <div className="admin-table-scroll">
              <table>
                <thead>
                  <tr>
                    {(section === 'users'
                      ? ['User', 'Joined', 'Status', 'Courtesy access', 'Manage']
                      : ['Customer', 'Subscription', 'Status', 'Paid until', 'Manage']
                    ).map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataPending ? (
                    <AdminTableSkeleton />
                  ) : section === 'users' ? (
                    (data.users?.rows || []).map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.email}</strong>
                          <small>{row.id}</small>
                        </td>
                        <td>{date(row.created_at)}</td>
                        <td>
                          <span className="admin-status">
                            {row.is_admin
                              ? 'Super admin'
                              : row.deletion_pending
                                ? 'Deletion pending'
                                : row.suspended
                                  ? 'Suspended'
                                  : 'Active'}
                          </span>
                        </td>
                        <td>{date(row.grant_until)}</td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              disabled={!enabled || row.is_admin || row.deletion_pending}
                              onClick={() =>
                                setPending({
                                  action: 'user',
                                  userId: row.id,
                                  operation: row.suspended ? 'restore' : 'suspend',
                                  reason: '',
                                  days: 30,
                                })
                              }
                            >
                              {row.suspended ? 'Activate' : 'Suspend'}
                            </button>
                            <button
                              disabled={!enabled || row.deletion_pending}
                              onClick={() =>
                                setPending({
                                  action: 'user',
                                  userId: row.id,
                                  operation: 'grant',
                                  reason: '',
                                  days: 30,
                                })
                              }
                            >
                              Grant Pro
                            </button>
                            {row.grant_until && (
                              <button
                                disabled={!enabled || row.deletion_pending}
                                onClick={() =>
                                  setPending({
                                    action: 'user',
                                    userId: row.id,
                                    operation: 'revoke_grant',
                                    reason: '',
                                    days: 30,
                                  })
                                }
                              >
                                Revoke grant
                              </button>
                            )}
                            <button
                              className="admin-delete-user"
                              disabled={!enabled || row.is_admin || !data.userDeletionReady}
                              onClick={() =>
                                setPending({
                                  action: 'delete_user',
                                  userId: row.id,
                                  confirmation: 'DELETE',
                                  reason: '',
                                })
                              }
                            >
                              {row.deletion_pending ? 'Retry deletion' : 'Delete user'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    (data.subscriptions?.rows || []).map((row) => (
                      <tr key={row.stripe_subscription_id}>
                        <td>{row.email}</td>
                        <td>
                          <small>{row.stripe_subscription_id}</small>
                        </td>
                        <td>
                          <span className="admin-status">{row.status}</span>
                          {row.cancel_at_period_end && <small>Ends at period close</small>}
                        </td>
                        <td>{date(row.paid_until)}</td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              disabled={
                                !enabled ||
                                !data.stripeReady ||
                                ['canceled', 'incomplete_expired'].includes(row.status)
                              }
                              onClick={() =>
                                setPending({
                                  action: 'subscription',
                                  requestId: crypto.randomUUID(),
                                  subscriptionId: row.stripe_subscription_id,
                                  operation: row.cancel_at_period_end ? 'resume' : 'cancel_end',
                                  reason: '',
                                })
                              }
                            >
                              {row.cancel_at_period_end ? 'Keep renewing' : 'Cancel at period end'}
                            </button>
                            <button
                              disabled={
                                !enabled ||
                                !data.stripeReady ||
                                ['canceled', 'incomplete_expired'].includes(row.status)
                              }
                              onClick={() =>
                                setPending({
                                  action: 'subscription',
                                  requestId: crypto.randomUUID(),
                                  subscriptionId: row.stripe_subscription_id,
                                  operation: 'cancel_now',
                                  reason: '',
                                })
                              }
                            >
                              End now
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {!total && !dataPending && (
                <EmptyState
                  text={
                    section === 'users' ? 'No users to display.' : 'No subscriptions to display.'
                  }
                />
              )}
            </div>
            <Pagination page={page} total={total} onChange={setPage} />
            <p className="admin-footnote">
              Suspension blocks account actions and Pro downloads. Billing cancellation and support
              stay available. Courtesy grants do not create a Stripe charge or cancel an existing
              subscription.
            </p>
          </section>
        )}
        {section === 'pricing' && (
          <div className="admin-overview-grid">
            <section className="admin-card">
              <span className="eyebrow">NEW PURCHASES</span>
              <h2>Make the plan fit your business.</h2>
              <p>
                Publishing creates new Stripe prices. Existing subscriptions retain their original
                prices and introductory terms.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const parsed = pricingSchema.safeParse(pricing);
                  if (!parsed.success) {
                    setError('Review the plan name, amounts, and trial duration.');
                    return;
                  }
                  setPending({
                    action: 'pricing',
                    requestId: crypto.randomUUID(),
                    expectedVersion: data.catalog.version,
                    pricing: parsed.data,
                    reason: '',
                  });
                }}
              >
                <fieldset
                  disabled={!enabled || !data.stripeReady}
                  aria-hidden={dataPending || undefined}
                >
                  <label>
                    Plan name
                    <input
                      value={pricing.name}
                      onChange={(e) => setPricing((p) => ({ ...p, name: e.target.value }))}
                      minLength={2}
                      maxLength={60}
                      required
                    />
                  </label>
                  <label>
                    Monthly price (USD)
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      step="0.01"
                      value={pricing.monthlyAmount / 100}
                      onChange={(e) =>
                        setPricing((p) => ({
                          ...p,
                          monthlyAmount: Math.round(Number(e.target.value) * 100),
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={pricing.trialEnabled}
                      onChange={(e) =>
                        setPricing((p) => ({ ...p, trialEnabled: e.target.checked }))
                      }
                    />
                    Offer a paid introductory period
                  </label>
                  <div className="admin-two-fields">
                    <label>
                      Introductory price (USD)
                      <input
                        type="number"
                        min="0.50"
                        max="1000"
                        step="0.01"
                        value={pricing.trialAmount / 100}
                        onChange={(e) =>
                          setPricing((p) => ({
                            ...p,
                            trialAmount: Math.round(Number(e.target.value) * 100),
                          }))
                        }
                        required
                      />
                    </label>
                    <label>
                      Introductory days
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={pricing.trialDays}
                        onChange={(e) =>
                          setPricing((p) => ({ ...p, trialDays: Number(e.target.value) }))
                        }
                        required
                      />
                    </label>
                  </div>
                  <button className="button primary" disabled={!enabled || !data.stripeReady}>
                    Review & publish pricing <ArrowUpRight size={16} />
                  </button>
                </fieldset>
              </form>
              {!data.stripeReady && (
                <p className="service-note">
                  Connect Stripe before publishing a plan. Editing prices does not charge any
                  customer.
                </p>
              )}
            </section>
            <div>
              <section className="admin-card admin-price-preview">
                <span className="pro-badge">PLAN PREVIEW</span>
                <h2>{dataPending ? <Skeleton width="65%" height={19} /> : pricing.name}</h2>
                <strong>
                  {dataPending ? (
                    <Skeleton width={90} height="1em" />
                  ) : (
                    money(pricing.trialEnabled ? pricing.trialAmount : pricing.monthlyAmount)
                  )}
                  <small>
                    {dataPending ? (
                      <Skeleton width={75} height={11} />
                    ) : pricing.trialEnabled ? (
                      ` for ${pricing.trialDays} days`
                    ) : (
                      ' / month'
                    )}
                  </small>
                </strong>
                <p>
                  {dataPending ? (
                    <Skeleton width="80%" height={12} />
                  ) : pricing.trialEnabled ? (
                    `Then ${money(pricing.monthlyAmount)} USD/month automatically.`
                  ) : (
                    'Renews monthly in USD.'
                  )}
                </p>
                <p>All Pro features. Payment at download.</p>
                <small>Customers see the full renewal terms before checkout.</small>
              </section>
              <section className="admin-card">
                <h2>Published versions</h2>
                {dataPending ? (
                  <ul className="admin-history" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <li key={i}>
                        <strong>
                          <Skeleton width="70%" height={12} />
                        </strong>
                        <small>
                          <Skeleton width="50%" height={10} />
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : data.priceHistory?.length ? (
                  <ul className="admin-history">
                    {data.priceHistory.map((row) => (
                      <li key={row.id}>
                        <strong>
                          {row.name} · {money(row.monthly_amount)}/month
                        </strong>
                        <small>
                          {date(row.created_at)} ·{' '}
                          {row.id === data.catalog.version ? 'Current' : 'Existing subscribers'}
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState text="The initial plan is $1 for 7 days, then $25/month." />
                )}
              </section>
            </div>
          </div>
        )}
        {section === 'settings' && (
          <section className="admin-card admin-settings">
            <h2>A clear signal to your customers.</h2>
            <p>
              These settings apply across the website. Admin access, sign-in, support, and
              subscription cancellation remain available during maintenance.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPending({ action: 'settings', settings });
              }}
            >
              <fieldset disabled={!enabled} aria-hidden={dataPending || undefined}>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={settings.maintenance}
                    onChange={(e) => setSettings((s) => ({ ...s, maintenance: e.target.checked }))}
                  />
                  Enable maintenance mode
                </label>
                <label>
                  Maintenance message
                  <textarea
                    rows={4}
                    minLength={10}
                    maxLength={500}
                    required
                    value={settings.maintenanceMessage}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, maintenanceMessage: e.target.value }))
                    }
                  />
                </label>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={settings.purchasesEnabled}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, purchasesEnabled: e.target.checked }))
                    }
                  />
                  Accept new purchases when billing is connected
                </label>
                <label>
                  Website announcement <small>Leave empty to hide the banner.</small>
                  <input
                    maxLength={240}
                    value={settings.announcement}
                    onChange={(e) => setSettings((s) => ({ ...s, announcement: e.target.value }))}
                  />
                </label>
                <button className="button primary">
                  Review changes <Check size={16} />
                </button>
              </fieldset>
            </form>
          </section>
        )}
        {section === 'support' && (
          <div className="admin-support-grid">
            <section className="admin-card">
              <div className="admin-table-top">
                <h2>Customer inquiries</h2>
                <Dropdown
                  label="Filter inquiries"
                  value={ticketFilter}
                  onValueChange={(value) => {
                    setTicketFilter(value);
                    setTicket(null);
                    setPage(1);
                  }}
                  options={['all', 'open', 'pending', 'resolved'].map((value) => ({
                    value,
                    label:
                      value === 'all' ? 'All inquiries' : value[0].toUpperCase() + value.slice(1),
                  }))}
                />
              </div>
              {dataPending && !ticket ? (
                <TicketListSkeleton />
              ) : (
                <div className="admin-ticket-list">
                  {(data.tickets?.rows || []).map((row) => (
                    <button
                      key={row.id}
                      className={ticket?.id === row.id ? 'selected' : ''}
                      onClick={() => {
                        setTicket(row);
                        setReply('');
                        setStatus(row.status);
                        setPriority(row.priority);
                      }}
                    >
                      <span>
                        <strong>{row.subject}</strong>
                        <span className="admin-status">{row.status}</span>
                      </span>
                      <small>{row.email}</small>
                      <small>
                        {date(row.updated_at)} · {row.priority} priority
                      </small>
                    </button>
                  ))}
                </div>
              )}
              {!dataPending && !data.tickets?.rows.length && (
                <EmptyState text="No inquiries in this view." />
              )}
              <Pagination page={page} total={data.tickets?.total || 0} onChange={setPage} />
            </section>
            <section className="admin-card">
              {ticket ? (
                <>
                  <span className="eyebrow">INQUIRY {ticket.id.slice(0, 8)}</span>
                  <h2>{ticket.subject}</h2>
                  <p>
                    {ticket.name} · {ticket.email}
                  </p>
                  {dataPending ? (
                    <ThreadSkeleton />
                  ) : (
                    <div className="support-thread">
                      <article>
                        <strong>Customer</strong>
                        <p>{ticket.message}</p>
                        <small>{date(ticket.created_at)}</small>
                      </article>
                      {(data.messages || []).map((message) => (
                        <article key={message.id} className={message.staff ? 'staff' : ''}>
                          <strong>{message.staff ? 'Folio support' : 'Customer'}</strong>
                          <p>{message.message}</p>
                          <small>{date(message.created_at)}</small>
                        </article>
                      ))}
                    </div>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void save({
                        action: 'support',
                        ticketId: ticket.id,
                        message: reply,
                        status: status as 'open' | 'pending' | 'resolved',
                        priority: priority as 'low' | 'normal' | 'high',
                      });
                    }}
                  >
                    <fieldset disabled={!enabled}>
                      <label>
                        Reply to customer
                        <textarea
                          rows={5}
                          maxLength={5000}
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder="Write a helpful reply…"
                        />
                      </label>
                      <div className="admin-two-fields">
                        <Dropdown
                          label="Inquiry status"
                          value={status}
                          onValueChange={setStatus}
                          options={['open', 'pending', 'resolved'].map((value) => ({
                            value,
                            label: value,
                          }))}
                        />
                        <Dropdown
                          label="Priority"
                          value={priority}
                          onValueChange={setPriority}
                          options={['low', 'normal', 'high'].map((value) => ({
                            value,
                            label: value,
                          }))}
                        />
                      </div>
                      <button className="button primary">
                        {reply.trim() ? 'Post reply & update' : 'Update inquiry'}{' '}
                        <Check size={16} />
                      </button>
                    </fieldset>
                  </form>
                  <p className="service-note">
                    Replies appear in the customer’s Support page after sign-in with the matching
                    email. No email notification is sent.
                  </p>
                </>
              ) : (
                <EmptyState text="Choose an inquiry to read the conversation and reply." />
              )}
            </section>
          </div>
        )}
        {section === 'audit' && (
          <>
            <AuditList rows={data.audit || []} loading={dataPending} />
            <div className="admin-pagination">
              <button
                className="icon-button"
                aria-label="Previous activity page"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              <span>Page {page}</span>
              <button
                className="icon-button"
                aria-label="Next activity page"
                disabled={(data.audit?.length || 0) < 25}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </>
        )}
      </main>
      <dialog
        ref={modal}
        className="admin-confirm"
        aria-labelledby="admin-confirm-title"
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setPending(null);
        }}
      >
        <button
          className="icon-button gate-close"
          aria-label="Close review"
          disabled={busy}
          onClick={() => setPending(null)}
        >
          <X size={20} />
        </button>
        <h2 id="admin-confirm-title">{actionTitle}</h2>
        {pending && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pending.action === 'delete_user' && deleteConfirmation !== 'DELETE') return;
              void save('reason' in pending ? { ...pending, reason } : pending);
            }}
          >
            <p>
              {pending.action === 'delete_user'
                ? `Delete ${data.users?.rows.find((row) => row.id === pending.userId)?.email || pending.userId} and permanently remove their login, stored PDFs, recovery drafts, profile, support conversations, and app billing data. Subscriptions will be canceled. This cannot be undone.`
                : pending.action === 'pricing'
                  ? `${pending.pricing.name}: ${money(pending.pricing.monthlyAmount)}/month${pending.pricing.trialEnabled ? `, with ${pending.pricing.trialDays} days for ${money(pending.pricing.trialAmount)}.` : ', with no introductory offer.'} Existing subscriptions keep their current prices.`
                  : pending.action === 'subscription'
                    ? `${pending.subscriptionId}: ${pending.operation === 'cancel_now' ? 'End the subscription and paid access immediately. This does not issue a refund.' : pending.operation === 'cancel_end' ? 'Stop renewal at the end of the paid period.' : 'Continue automatic renewal at the existing price.'}`
                    : pending.action === 'user'
                      ? `${pending.operation === 'restore' ? 'Activate' : pending.operation.replaceAll('_', ' ')} for account ${pending.userId}. This does not change Stripe billing.`
                      : pending.action === 'settings'
                        ? `Maintenance will be ${pending.settings.maintenance ? 'on' : 'off'}. New purchases will be ${pending.settings.purchasesEnabled ? 'enabled when billing is ready' : 'paused'}.`
                        : 'Update this inquiry.'}
            </p>
            {pending.action === 'delete_user' && (
              <>
                <p className="service-note">
                  A minimal deletion audit record is kept. Stripe retains historical payment
                  records; this action does not issue refunds. If cleanup fails, the user stays
                  suspended until you retry deletion.
                </p>
                <label>
                  Type DELETE to confirm
                  <input
                    autoComplete="off"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    required
                    pattern="DELETE"
                    disabled={busy}
                  />
                </label>
              </>
            )}
            {pending.action === 'user' && pending.operation === 'grant' && (
              <label>
                Days of courtesy access
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={pending.days}
                  onChange={(e) =>
                    setPending((p) =>
                      p?.action === 'user' ? { ...p, days: Number(e.target.value) } : p,
                    )
                  }
                />
              </label>
            )}
            {'reason' in pending && (
              <label>
                Reason for this change
                <textarea
                  required
                  minLength={3}
                  maxLength={500}
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <div className="gate-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={
                  busy ||
                  !authorized ||
                  (pending.action === 'delete_user' && deleteConfirmation !== 'DELETE')
                }
              >
                {pending.action === 'delete_user'
                  ? busy
                    ? 'Deleting…'
                    : 'Permanently delete user'
                  : busy
                    ? 'Saving…'
                    : 'Confirm change'}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
function EmptyState({ text }: { text: string }) {
  return (
    <div className="admin-empty">
      <Inbox size={25} />
      <p>{text}</p>
    </div>
  );
}
function Pagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="admin-pagination">
      <span>
        Page {page} of {Math.max(1, Math.ceil(total / 25))}
      </span>
      <button
        className="icon-button"
        aria-label="Previous results page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        className="icon-button"
        aria-label="Next results page"
        disabled={page * 25 >= total}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
function AuditList({ rows, loading = false }: { rows: AuditEntry[]; loading?: boolean }) {
  return (
    <section className="admin-card">
      <h2>Recorded activity</h2>
      <p>Pricing, account access, subscription changes, and support updates leave a record.</p>
      {loading ? (
        <AuditSkeleton />
      ) : rows.length ? (
        <ul className="admin-audit-list">
          {rows.map((row) => (
            <li key={row.id}>
              <History size={17} />
              <div>
                <strong>{row.action.replaceAll('.', ' · ').replaceAll('_', ' ')}</strong>
                <p>{row.target}</p>
                <small>
                  {new Date(row.created_at).toLocaleString()} · Admin {row.actor_id?.slice(0, 8)}
                </small>
                <details>
                  <summary>Change details</summary>
                  <pre>{JSON.stringify(row.detail, null, 2)}</pre>
                </details>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState text="Administrative activity will appear here." />
      )}
    </section>
  );
}

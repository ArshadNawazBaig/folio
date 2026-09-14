'use client';
import Link from 'next/link';
import { isLemonUrl } from '@/lib/lemon-squeezy';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  Gem,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAccount } from '../account-provider';
import { accountFetch, authClient } from '@/lib/auth-client';
import { displayName } from '@/lib/dashboard';
import { Skeleton, LoadingLabel } from '../skeleton';
import s from './dashboard.module.css';
type BillingDetails = {
  hasCustomer: boolean;
  subscription: {
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
};
export function DashboardBilling({ checkoutSuccess }: { checkoutSuccess: boolean }) {
  const { access, refresh, loading: accessLoading } = useAccount();
  const [details, setDetails] = useState<BillingDetails | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (signal?: AbortSignal) => {
    setError('');
    try {
      const data = await (await accountFetch('/api/account/billing', { signal })).json();
      if (!signal?.aborted) setDetails(data);
    } catch (e) {
      if (!signal?.aborted)
        setError(e instanceof Error ? e.message : 'Billing could not be loaded.');
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  async function portal() {
    setBusy(true);
    setError('');
    try {
      const { url } = await (await accountFetch('/api/billing/portal', { method: 'POST' })).json();
      const target = new URL(url);
      if (!isLemonUrl(target.href, 'portal'))
        throw new Error('The billing link could not be verified.');
      window.location.assign(target.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Billing could not be opened.');
      setBusy(false);
    }
  }
  const expiry = access.expiresAt
    ? new Date(access.expiresAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;
  const status = details?.subscription?.status;
  return (
    <div className={s.settingsStack}>
      {checkoutSuccess && (
        <p role="status" className={s.notice}>
          Thanks for checking out. Your plan updates once payment is confirmed. Refresh your
          subscription if it hasn’t appeared yet.
        </p>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <section className={`${s.card} ${s.planCard}`}>
        <div>
          <span className={s.eyebrow}>YOUR CURRENT PLAN</span>
          <h2>
            <Gem size={27} />
            {accessLoading ? (
              <Skeleton width={140} height="1em" />
            ) : access.pro ? (
              'Folio Pro'
            ) : (
              'Folio Free'
            )}
          </h2>
          <p>
            {accessLoading ? (
              <Skeleton width="85%" height={12} />
            ) : access.pro ? (
              'All available Pro tools and Pro downloads are included.'
            ) : (
              'Free tools and downloads, plus a private home for your PDFs.'
            )}
          </p>
          {expiry && (
            <p className={s.planDate}>
              {access.cancelAtPeriodEnd
                ? 'Access ends'
                : access.courtesy
                  ? 'Courtesy access ends'
                  : access.trial
                    ? 'Introductory period ends'
                    : 'Paid access until'}{' '}
              <strong>{expiry}</strong>.
            </p>
          )}
          {access.pro && !access.courtesy && !access.cancelAtPeriodEnd && access.renewalLabel && (
            <p>
              {access.trial ? 'Then ' : 'Subscription price: '}
              {access.renewalLabel} USD/month, billed automatically. Cancel in Manage billing before
              renewal to avoid the next charge.
            </p>
          )}
          {access.cancelAtPeriodEnd && (
            <p className={s.notice}>
              Your cancellation is scheduled. You can manage it in the billing portal.
            </p>
          )}
          {(status === 'past_due' || status === 'unpaid') && (
            <p role="status" className={s.notice}>
              A payment needs attention. Open Manage billing to review your payment method and
              invoices.
            </p>
          )}
        </div>
        <div className={s.planActions}>
          {!access.pro && (
            <Link className="button primary" href="/pricing">
              Explore Pro plans <ArrowRight size={16} />
            </Link>
          )}
          <button
            className="button secondary"
            disabled={busy || accessLoading}
            onClick={() => {
              void refresh();
              void load();
            }}
          >
            <RefreshCw size={16} /> Refresh subscription
          </button>
        </div>
      </section>
      <section className={s.card}>
        <span className={s.cardIcon}>
          <CreditCard size={23} />
        </span>
        <h2>Billing, without the back-and-forth.</h2>
        <p>
          View and download invoices, update your payment method, and manage or cancel your
          subscription in the secure billing portal.
        </p>
        <div className={s.billingFeatures}>
          <span>Invoices & receipts</span>
          <span>Payment methods</span>
          <span>Subscription & cancellation</span>
        </div>
        {!details && !error ? (
          <div className={s.billingLoading} aria-busy="true">
            <LoadingLabel>Loading billing details…</LoadingLabel>
            <Skeleton width={172} height={44} radius={7} />
            <p className={s.muted}>
              <Skeleton width="72%" height={11} />
            </p>
          </div>
        ) : (
          <button
            className="button primary"
            disabled={busy || !details?.hasCustomer}
            onClick={() => void portal()}
          >
            {busy ? 'Opening billing…' : 'Manage billing'}
            <ArrowUpRight size={16} />
          </button>
        )}
        {details && !details.hasCustomer && (
          <p className={s.muted}>
            You don’t have a billing account yet. It’s created when you begin checkout.
          </p>
        )}
        {error && (
          <button className="text-link" onClick={() => void load()}>
            Retry billing details
          </button>
        )}
      </section>
      <p className={s.muted}>
        Need help with a charge?{' '}
        <Link className="text-link" href="/dashboard?view=support">
          Contact support <ArrowRight size={14} />
        </Link>
      </p>
    </div>
  );
}
export function DashboardSettings() {
  const { user } = useAccount();
  const [name, setName] = useState(displayName(user?.user_metadata));
  const [company, setCompany] = useState(
    typeof user?.user_metadata.company === 'string' ? user.user_metadata.company : '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const client = authClient();
      if (!client) throw new Error('Sign in to update your profile.');
      const result = await client.auth.updateUser({
        data: { full_name: name.trim(), company: company.trim() },
      });
      if (result.error) throw new Error('Your profile could not be saved. Please try again.');
      setNotice('Your profile has been saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Your profile could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  async function endOtherSessions() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await authClient()!.auth.signOut({ scope: 'others' });
      if (result.error)
        throw new Error('Other sessions could not be signed out. Please try again.');
      dialog.current?.close();
      setNotice(
        'Other sessions will need to sign in again when their current access tokens expire. You’re still signed in here.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This action could not be completed.');
    } finally {
      setBusy(false);
    }
  }
  const google = user?.app_metadata.providers?.includes('google');
  return (
    <div className={s.settingsStack}>
      {notice && (
        <p role="status" className={s.notice}>
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <section className={s.card}>
        <div className={s.profileIntro}>
          <span className={s.largeAvatar}>
            {displayName(user?.user_metadata).slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h2>Your profile</h2>
            <p>The details that make this space yours.</p>
          </div>
        </div>
        <form className={s.profileForm} onSubmit={save}>
          <div className={s.fieldGrid}>
            <label className={s.field}>
              Full name
              <input
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className={s.field}>
              Company <span className={s.optional}>(optional)</span>
              <input
                name="organization"
                autoComplete="organization"
                maxLength={100}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </label>
          </div>
          <label className={s.field}>
            Email address
            <input
              type="email"
              readOnly
              value={user?.email || ''}
              aria-describedby="profile-email-help"
            />
          </label>
          <p id="profile-email-help" className={s.muted}>
            Your sign-in email is managed by your login provider. Contact support if you need help
            changing accounts.
          </p>
          <div className="form-actions">
            <button className="button primary" disabled={busy || !name.trim()}>
              {busy ? 'Saving…' : 'Save profile'}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </section>
      <section className={s.card}>
        <span className={s.cardIcon}>
          <LockKeyhole size={23} />
        </span>
        <h2>Sign-in & security</h2>
        <div className={s.securityRow}>
          <div>
            <strong>{google ? 'Google sign-in connected' : 'Email link sign-in'}</strong>
            <p>
              {google
                ? 'Use your Google account to sign in securely.'
                : 'Use the secure sign-in link sent to your email.'}
            </p>
          </div>
          <ShieldCheck size={22} />
        </div>
        <div className={s.securityRow}>
          <div>
            <strong>Signed in somewhere else?</strong>
            <p>End other sessions while keeping this browser signed in.</p>
          </div>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => dialog.current?.showModal()}
          >
            Sign out other sessions
          </button>
        </div>
        <p className={s.muted}>
          Member since{' '}
          {user?.created_at
            ? new Date(user.created_at).toLocaleDateString(undefined, {
                month: 'long',
                year: 'numeric',
              })
            : '—'}
          .
        </p>
      </section>
      <section className={s.card}>
        <h2>Your data, your control.</h2>
        <p>
          Cloud files are private to your account. You can download or delete them in My files. New
          saves go to cloud storage. Unsaved changes stay in the current tab until you save.
        </p>
        <div className={s.inlineActions}>
          <Link className="text-link" href="/dashboard?view=files">
            Manage your files <ArrowRight size={15} />
          </Link>
          <Link className="text-link" href="/dashboard?view=support">
            Request account deletion <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>
      <dialog
        className={`confirm-dialog ${s.dialog}`}
        aria-labelledby="sessions-dialog-title"
        ref={dialog}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <header className="dialog-header">
          <h2 id="sessions-dialog-title">Sign out other sessions?</h2>
        </header>
        <div className="dialog-body">
          <p>
            Other browsers and devices will need to sign in again after their current access tokens
            expire. This browser stays signed in.
          </p>
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
        </div>
        <footer className="dialog-footer">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void endOtherSessions()}
          >
            {busy ? 'Signing out…' : 'Confirm sign-out'}
          </button>
        </footer>
      </dialog>
    </div>
  );
}

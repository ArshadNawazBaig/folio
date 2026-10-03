'use client';
import { useUiTranslation, useUiLocale } from '../ui-language';
import { localizedHref } from '@/lib/i18n/translate';
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
  const tr = useUiTranslation();
  const locale = useUiLocale();
  const href = (path: string) => localizedHref(locale, path);

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
    ? new Date(access.expiresAt).toLocaleString(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;
  const status = details?.subscription?.status;
  return (
    <div className={s.settingsStack}>
      {checkoutSuccess && (
        <p role="status" className={s.notice}>
          {tr(
            'Thanks for checking out. Your plan updates once payment is confirmed. Refresh your subscription if it hasn’t appeared yet.',
          )}
        </p>
      )}
      {error && (
        <p role="alert" className="error-message">
          {tr(error)}
        </p>
      )}
      <section className={`${s.card} ${s.planCard}`}>
        <div>
          <span className={s.eyebrow}>{tr('YOUR CURRENT PLAN')}</span>
          <h2>
            <Gem size={27} />
            {accessLoading ? (
              <Skeleton width={140} height="1em" />
            ) : access.pro ? (
              'Folio Pro'
            ) : (
              tr('Folio Free')
            )}
          </h2>
          <p>
            {accessLoading ? (
              <Skeleton width="85%" height={12} />
            ) : access.pro ? (
              tr('All available Pro tools and Pro downloads are included.')
            ) : (
              tr('Free tools and downloads, plus a private home for your PDFs.')
            )}
          </p>
          {expiry && (
            <p className={s.planDate}>
              {access.cancelAtPeriodEnd
                ? tr('Access ends')
                : access.courtesy
                  ? tr('Courtesy access ends')
                  : access.trial
                    ? tr('Introductory period ends')
                    : tr('Paid access until')}{' '}
              <strong>{expiry}</strong>.
            </p>
          )}
          {access.pro && !access.courtesy && !access.cancelAtPeriodEnd && access.renewalLabel && (
            <p>
              {access.trial ? tr('Then ') : tr('Subscription price: ')}
              {tr(
                '{price} USD/month, billed automatically. Cancel in Manage billing before renewal to avoid the next charge.',
                { price: access.renewalLabel },
              )}
            </p>
          )}
          {access.cancelAtPeriodEnd && (
            <p className={s.notice}>
              {tr('Your cancellation is scheduled. You can manage it in the billing portal.')}
            </p>
          )}
          {(status === 'past_due' || status === 'unpaid') && (
            <p role="status" className={s.notice}>
              {tr(
                'A payment needs attention. Open Manage billing to review your payment method and invoices.',
              )}
            </p>
          )}
        </div>
        <div className={s.planActions}>
          {!access.pro && (
            <Link className="button primary" href={href('/pricing')}>
              {tr('Explore Pro plans')} <ArrowRight size={16} />
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
            <RefreshCw size={16} /> {tr('Refresh subscription')}
          </button>
        </div>
      </section>
      <section className={s.card}>
        <span className={s.cardIcon}>
          <CreditCard size={23} />
        </span>
        <h2>{tr('Billing, without the back-and-forth.')}</h2>
        <p>
          {tr(
            'View and download invoices, update your payment method, and manage or cancel your subscription in the secure billing portal.',
          )}
        </p>
        <div className={s.billingFeatures}>
          <span>{tr('Invoices & receipts')}</span>
          <span>{tr('Payment methods')}</span>
          <span>{tr('Subscription & cancellation')}</span>
        </div>
        {!details && !error ? (
          <div className={s.billingLoading} aria-busy="true">
            <LoadingLabel>{tr('Loading billing details…')}</LoadingLabel>
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
            {busy ? tr('Opening billing…') : tr('Manage billing')}
            <ArrowUpRight size={16} />
          </button>
        )}
        {details && !details.hasCustomer && (
          <p className={s.muted}>
            {tr('You don’t have a billing account yet. It’s created when you begin checkout.')}
          </p>
        )}
        {error && (
          <button className="text-link" onClick={() => void load()}>
            {tr('Retry billing details')}
          </button>
        )}
      </section>
      <p className={s.muted}>
        {tr('Need help with a charge?')}{' '}
        <Link className="text-link" href={href('/dashboard?view=support')}>
          {tr('Contact support')} <ArrowRight size={14} />
        </Link>
      </p>
    </div>
  );
}
export function DashboardSettings() {
  const tr = useUiTranslation();
  const locale = useUiLocale();
  const href = (path: string) => localizedHref(locale, path);

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
      const client = await authClient();
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
      const result = await (await authClient())!.auth.signOut({ scope: 'others' });
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
          {tr(notice)}
        </p>
      )}
      {error && (
        <p role="alert" className="error-message">
          {tr(error)}
        </p>
      )}
      <section className={s.card}>
        <div className={s.profileIntro}>
          <span className={s.largeAvatar}>
            {displayName(user?.user_metadata).slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h2>{tr('Your profile')}</h2>
            <p>{tr('The details that make this space yours.')}</p>
          </div>
        </div>
        <form className={s.profileForm} onSubmit={save}>
          <div className={s.fieldGrid}>
            <label className={s.field}>
              {tr('Full name')}
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
              {tr('Company')} <span className={s.optional}>{tr('(optional)')}</span>
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
            {tr('Email address')}
            <input
              type="email"
              readOnly
              value={user?.email || ''}
              aria-describedby="profile-email-help"
            />
          </label>
          <p id="profile-email-help" className={s.muted}>
            {tr(
              'Your sign-in email is managed by your login provider. Contact support if you need help changing accounts.',
            )}
          </p>
          <div className="form-actions">
            <button className="button primary" disabled={busy || !name.trim()}>
              {busy ? tr('Saving…') : tr('Save profile')}
              <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </section>
      <section className={s.card}>
        <span className={s.cardIcon}>
          <LockKeyhole size={23} />
        </span>
        <h2>{tr('Sign-in & security')}</h2>
        <div className={s.securityRow}>
          <div>
            <strong>{google ? tr('Google sign-in connected') : tr('Email link sign-in')}</strong>
            <p>
              {google
                ? tr('Use your Google account to sign in securely.')
                : tr('Use the secure sign-in link sent to your email.')}
            </p>
          </div>
          <ShieldCheck size={22} />
        </div>
        <div className={s.securityRow}>
          <div>
            <strong>{tr('Signed in somewhere else?')}</strong>
            <p>{tr('End other sessions while keeping this browser signed in.')}</p>
          </div>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => dialog.current?.showModal()}
          >
            {tr('Sign out other sessions')}
          </button>
        </div>
        <p className={s.muted}>
          {tr('Member since')}{' '}
          {user?.created_at
            ? new Date(user.created_at).toLocaleDateString(locale, {
                month: 'long',
                year: 'numeric',
              })
            : '—'}
          .
        </p>
      </section>
      <section className={s.card}>
        <h2>{tr('Your data, your control.')}</h2>
        <p>
          {tr(
            'Cloud files are private to your account. You can download or delete them in My files. New saves go to cloud storage. Unsaved changes stay in the current tab until you save.',
          )}
        </p>
        <div className={s.inlineActions}>
          <Link className="text-link" href={href('/dashboard?view=files')}>
            {tr('Manage your files')} <ArrowRight size={15} />
          </Link>
          <Link className="text-link" href={href('/dashboard?view=support')}>
            {tr('Request account deletion')} <ArrowUpRight size={15} />
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
          <h2 id="sessions-dialog-title">{tr('Sign out other sessions?')}</h2>
        </header>
        <div className="dialog-body">
          <p>
            {tr(
              'Other browsers and devices will need to sign in again after their current access tokens expire. This browser stays signed in.',
            )}
          </p>
          {error && (
            <p role="alert" className="error-message">
              {tr(error)}
            </p>
          )}
        </div>
        <footer className="dialog-footer">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            {tr('Cancel')}
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => void endOtherSessions()}
          >
            {busy ? tr('Signing out…') : tr('Confirm sign-out')}
          </button>
        </footer>
      </dialog>
    </div>
  );
}

'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Cloud,
  CreditCard,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAccount } from '../account-provider';
import { Logo } from '../logo';
import { SignInForm } from '../sign-in-form';
import { SupportPanel } from '../support-panel';
import { accountFetch, authClient } from '@/lib/auth-client';
import { displayName, type DashboardView } from '@/lib/dashboard';
import {
  FREE_STORAGE_LIMIT,
  PRO_STORAGE_LIMIT,
  storageLabel,
  type StorageUsage,
  type CloudDocument,
} from '@/lib/cloud-types';
import { formatBytes } from '@/lib/utils';
import { CloudFiles } from './cloud-files';
import { DashboardBilling, DashboardSettings } from './account-settings';
import { Skeleton, SignInSkeleton, LoadingLabel } from '../skeleton';
import s from './dashboard.module.css';
const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'files', label: 'My files', icon: FolderOpen },
  { id: 'billing', label: 'Billing & plan', icon: CreditCard },
  { id: 'settings', label: 'Account settings', icon: Settings },
  { id: 'support', label: 'Help & support', icon: MessageSquare },
] as const;
type Props = { view: DashboardView; adminRequired: boolean; checkoutSuccess: boolean };
export function UserDashboard(props: Props) {
  const { user, loading } = useAccount();
  if (!user)
    return (
      <main id="main" className={s.signedOut}>
        <Logo />
        <div className="account-card">
          <span className="account-symbol">
            <FolderOpen size={25} />
          </span>
          <h1>Your personal workspace.</h1>
          {loading ? (
            <SignInSkeleton />
          ) : (
            <>
              <p>Sign in to find your files, manage billing, and make yourself at home.</p>
              <SignInForm
                destination={
                  props.view === 'overview' ? '/dashboard' : `/dashboard?view=${props.view}`
                }
              />
            </>
          )}
          <Link className="text-link" href="/">
            Back to Folio <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    );
  // Reset every private view and in-flight result when the account changes.
  return <DashboardContent key={user.id} {...props} />;
}
function DashboardContent({ view, adminRequired, checkoutSuccess }: Props) {
  const { user, access, loading: accountLoading, error: accountError } = useAccount();
  const navigationRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navigationRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && active && nav.scrollWidth > nav.clientWidth) {
      nav.scrollLeft +=
        active.getBoundingClientRect().left -
        nav.getBoundingClientRect().left -
        (nav.clientWidth - active.offsetWidth) / 2;
    }
  }, [view]);
  const router = useRouter();
  const [files, setFiles] = useState<CloudDocument[]>([]);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileError, setFileError] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const loadFiles = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setFileError('');
    try {
      const data = await (await accountFetch('/api/account/files', { signal })).json();
      if (!signal?.aborted) {
        setFiles(data.files);
        setStorage(data.storage || null);
      }
    } catch (error) {
      if (!signal?.aborted)
        setFileError(error instanceof Error ? error.message : 'Your files could not be loaded.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void loadFiles(controller.signal);
    const onFocus = () => void loadFiles(controller.signal);
    window.addEventListener('focus', onFocus);
    return () => {
      controller.abort();
      window.removeEventListener('focus', onFocus);
    };
  }, [loadFiles]);
  async function signOut() {
    setSigningOut(true);
    setSessionError('');
    try {
      const result = await authClient()!.auth.signOut({ scope: 'local' });
      if (result.error) throw result.error;
      router.replace('/account');
    } catch {
      setSessionError('Sign-out could not finish. Please try again.');
      setSigningOut(false);
    }
  }
  const name = displayName(user?.user_metadata);
  const ready = files.filter((f) => f.status === 'ready');
  const bytes = storage?.used ?? files.reduce((n, f) => n + f.size + (f.workspace_size || 0), 0);
  const capacity = storage?.limit ?? (access.pro ? PRO_STORAGE_LIMIT : FREE_STORAGE_LIMIT);
  const titles = {
    overview: `Welcome back${name === 'Your account' ? '' : `, ${name.split(' ')[0]}`}.`,
    files: 'A home for your documents.',
    billing: 'Your plan, your choice.',
    settings: 'Make yourself at home.',
    support: 'A little help, right here.',
  };
  const descriptions = {
    overview: 'Pick up where you left off, or start something new.',
    files: 'Private PDFs, ready whenever you need them.',
    billing: 'Manage your subscription, payments, and invoices.',
    settings: 'Keep your profile up to date and manage your sessions.',
    support: 'Ask a question and follow your conversations with our team.',
  };
  return (
    <div className={s.dashboard}>
      <aside className={s.sidebar}>
        <Logo />
        <p className={s.navLabel}>YOUR WORKSPACE</p>
        <nav ref={navigationRef} aria-label="Dashboard navigation" className={s.navigation}>
          {navigation.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              href={id === 'overview' ? '/dashboard' : `/dashboard?view=${id}`}
              aria-current={view === id ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === 'files' && !loading && !fileError && <small>{ready.length}</small>}
            </Link>
          ))}
        </nav>
        <div className={s.sidebarBottom}>
          <div className={s.storage}>
            <Cloud size={19} />
            <strong>Private cloud storage</strong>
            <span>
              {fileError ? (
                'Storage unavailable'
              ) : loading && !storage ? (
                <>
                  <Skeleton width="86%" height={10} />
                  <LoadingLabel>Loading storage usage…</LoadingLabel>
                </>
              ) : (
                `${bytes ? formatBytes(bytes) : '0 KB'} of ${storageLabel(capacity)}`
              )}
            </span>
            <progress
              aria-label="Cloud storage used"
              value={Math.min(bytes, capacity)}
              max={capacity}
            />
            {!loading && !fileError && bytes >= capacity && (
              <span>Storage full. Delete older files to upload more.</span>
            )}
            <Link href="/dashboard?view=files">
              Manage files <ArrowRight size={14} />
            </Link>
          </div>
          {access.admin && (
            <Link href="/admin" className={s.adminLink}>
              <ShieldCheck size={17} /> Super admin dashboard
            </Link>
          )}
          <div className={s.sidebarProfile}>
            <span className={s.avatar}>{name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{name}</strong>
              <small>{access.pro ? 'Folio Pro' : 'Folio Free'}</small>
            </div>
          </div>
          <button className={s.signOut} disabled={signingOut} onClick={() => void signOut()}>
            <LogOut size={16} />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>
      <div className={s.mainColumn}>
        <header className={s.topbar}>
          <span>
            My workspace <span className={s.crumb}>/</span>{' '}
            <strong>{navigation.find((n) => n.id === view)?.label}</strong>
          </span>
          <Link href="/tools">
            All PDF tools <ArrowUpRight size={16} />
          </Link>
        </header>
        <main id="main" className={s.content}>
          <div className={s.heading}>
            <div>
              <span className={s.eyebrow}>
                {view === 'overview' ? 'A LITTLE MORE ORGANIZED' : 'YOUR FOLIO'}
              </span>
              <h1>{titles[view]}</h1>
              <p>{descriptions[view]}</p>
            </div>
            {view === 'overview' && (
              <Link className="button primary" href="/workspace">
                <Plus size={17} /> Edit a PDF
              </Link>
            )}
          </div>
          {adminRequired && !access.admin && (
            <p role="status" className={s.notice}>
              You’re signed in, but this account does not have super admin access. Your PDF tools
              are still available.
            </p>
          )}
          {(accountError || sessionError) && (
            <p role="alert" className="error-message">
              {sessionError || accountError}
            </p>
          )}
          {view === 'overview' && (
            <>
              <div className={s.metrics}>
                <Link href="/dashboard?view=files">
                  <span className={s.metricIcon}>
                    <FolderOpen size={21} />
                  </span>
                  <div>
                    <span>Saved PDFs</span>
                    <strong>
                      {loading && !storage ? (
                        <Skeleton width={35} height="1em" />
                      ) : fileError ? (
                        '—'
                      ) : (
                        ready.length
                      )}
                    </strong>
                    <small>In your private cloud</small>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
                <Link href="/dashboard?view=billing">
                  <span className={s.metricIcon}>
                    <CreditCard size={21} />
                  </span>
                  <div>
                    <span>Your plan</span>
                    <strong>
                      {accountLoading ? (
                        <Skeleton width={110} height="1em" />
                      ) : accountError ? (
                        'Unavailable'
                      ) : access.pro ? (
                        'Folio Pro'
                      ) : (
                        'Folio Free'
                      )}
                    </strong>
                    <small>
                      {access.trial
                        ? 'Introductory period'
                        : access.cancelAtPeriodEnd
                          ? 'Cancellation scheduled'
                          : 'Manage your membership'}
                    </small>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
                <Link href="/dashboard?view=settings">
                  <span className={s.metricIcon}>
                    <ShieldCheck size={21} />
                  </span>
                  <div>
                    <span>Account</span>
                    <strong>All yours.</strong>
                    <small>Profile & sign-in settings</small>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
              </div>
              <section className={s.quickCard}>
                <div>
                  <span className={s.eyebrow}>FROM TO-DO TO DONE</span>
                  <h2>Good work starts with a PDF.</h2>
                  <p>Edit a proposal, fill a form, or bring a few files together.</p>
                </div>
                <div className={s.quickLinks}>
                  <Link href="/workspace">
                    <FileText size={20} /> Edit PDF <ArrowUpRight size={16} />
                  </Link>
                  <Link href="/forms">
                    Fill a form <ArrowUpRight size={16} />
                  </Link>
                  <Link href="/merge-pdf">
                    Merge PDFs <ArrowUpRight size={16} />
                  </Link>
                </div>
              </section>
            </>
          )}
          {(view === 'overview' || view === 'files') && (
            <CloudFiles
              key={view}
              files={files}
              storage={
                storage ?? {
                  used: bytes,
                  limit: capacity,
                  available: Math.max(0, capacity - bytes),
                  full: bytes >= capacity,
                  recovery: [],
                }
              }
              loading={loading}
              error={fileError}
              refresh={loadFiles}
              compact={view === 'overview'}
            />
          )}
          {view === 'billing' && <DashboardBilling checkoutSuccess={checkoutSuccess} />}
          {view === 'settings' && <DashboardSettings />}
          {view === 'support' && (
            <div className={s.support}>
              <SupportPanel />
            </div>
          )}
          <footer className={s.footer}>
            <span>Made for the work that matters.</span>
            <Link href="/dashboard?view=support">
              Need a hand? <ArrowUpRight size={14} />
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}

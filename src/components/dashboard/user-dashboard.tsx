'use client';
import { FREE_LAUNCH } from '@/lib/access-policy';
import { useUiTranslation, useUiLocale } from '../ui-language';
import { localizedHref } from '@/lib/i18n/translate';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Menu } from '@base-ui/react/menu';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Cloud,
  CreditCard,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Link2,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { LanguageSelector } from '../language-selector';
import { signInHref } from '@/lib/auth-navigation';
import { useAccount } from '../account-provider';
import { Logo } from '../logo';
import { GuestAccount } from './guest-account';
import { ShortLinks } from '../short-links';
import { InvoiceLibrary } from '../invoice-library';
import { SupportPanel } from '../support-panel';
import { accountFetch, authClient } from '@/lib/auth-client';
import { claimGuestWorkspaces, workspaceRequest } from '@/lib/workspace-client';
import { displayName, type DashboardView } from '@/lib/dashboard';
import {
  FREE_STORAGE_LIMIT,
  PRO_STORAGE_LIMIT,
  storageLabel,
  type StorageUsage,
  type CloudDocument,
} from '@/lib/cloud-types';
import { PAGE_SIZE, pageCount } from '@/lib/pagination.mjs';
import { formatBytes } from '@/lib/utils';
import { CloudFiles, CloudFileSkeleton } from './cloud-files';
import { DashboardBilling, DashboardSettings } from './account-settings';
import { Skeleton, LoadingLabel } from '../skeleton';
import s from './dashboard.module.css';
const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'files', label: 'My files', icon: FolderOpen },
  { id: 'links', label: 'My links', icon: Link2 },
  { id: 'invoices', label: 'My invoices', icon: FileText },
  { id: 'billing', label: 'Billing & plan', icon: CreditCard },
  { id: 'settings', label: 'Account settings', icon: Settings },
  { id: 'support', label: 'Help & support', icon: MessageSquare },
] as const;
const visibleNavigation = navigation.filter((item) => !FREE_LAUNCH || item.id !== 'billing');
type Props = { view: DashboardView; adminRequired: boolean; checkoutSuccess: boolean };
export function UserDashboard(input: Props) {
  const props =
    FREE_LAUNCH && input.view === 'billing' ? { ...input, view: 'settings' as const } : input;
  const { user, loading } = useAccount();
  if (loading && !user) return <DashboardLoading view={props.view} />;
  // Reset every private view and in-flight result when the account changes.
  return <DashboardContent key={user?.id || 'guest'} {...props} />;
}
function DashboardLoading({ view }: { view: DashboardView }) {
  const locale = useUiLocale();
  const href = (path: string) => localizedHref(locale, path);
  const tr = useUiTranslation();

  return (
    <div className={s.dashboard} aria-busy="true">
      <aside className={s.sidebar}>
        <Logo light href={href('/')} label={tr('Folio home')} />
        <p className={s.navLabel}>{tr('YOUR WORKSPACE')}</p>
        <div className={s.navigation} aria-hidden="true">
          {visibleNavigation.map(({ id, icon: Icon }) => (
            <div className={s.navSkeleton} key={id}>
              <Icon size={18} />
              <Skeleton width={100} height={12} />
            </div>
          ))}
        </div>
        <div className={s.sidebarBottom}>
          <div className={s.storage}>
            <Cloud size={19} />
            <Skeleton width={135} height={12} />
            <Skeleton width={110} height={10} />
            <Skeleton height={5} />
          </div>
        </div>
      </aside>
      <div className={s.mainColumn}>
        <header className={s.topbar} aria-label={tr('Workspace navigation')}>
          <div className={s.topbarLogo}>
            <Logo light href={href('/')} label={tr('Folio home')} />
          </div>
          <div className={s.breadcrumb}>
            <Skeleton width={170} height={12} />
          </div>
          <div className={s.topbarActions}>
            <LanguageSelector
              label={tr('Language')}
              query={view === 'overview' ? '' : `view=${view}`}
            />
            <Skeleton width={36} height={36} radius="50%" />
          </div>
        </header>
        <main id="main" className={s.content}>
          <LoadingLabel>{tr('Loading your workspace…')}</LoadingLabel>
          <div className={`${s.heading} page-heading page-heading--workspace`}>
            <div>
              <Skeleton width={110} height={10} />
              <h1>
                <Skeleton width="min(430px, 70vw)" height="1em" />
              </h1>
              <Skeleton width="min(290px, 65vw)" height={14} />
            </div>
          </div>
          <section className={s.fileSection}>
            <div className={s.sectionHeading}>
              <div>
                <h2>
                  <Skeleton width={120} height="1em" />
                </h2>
                <Skeleton width={160} height={12} />
              </div>
              <Skeleton width={116} height={42} radius={9} />
            </div>
            <CloudFileSkeleton />
          </section>
        </main>
      </div>
    </div>
  );
}
function DashboardContent({ view, adminRequired, checkoutSuccess }: Props) {
  const tr = useUiTranslation();
  const locale = useUiLocale();
  const href = (path: string) => localizedHref(locale, path);

  const { user, access, loading: accountLoading, error: accountError, signOutGuest } = useAccount();
  const guest = !user;
  const sessionReady = !!user || !accountLoading;
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
  const [filePageSize, setFilePageSize] = useState(PAGE_SIZE);
  const [filePage, setFilePage] = useState(1),
    [fileQuery, setFileQuery] = useState(''),
    [fileSort, setFileSort] = useState('recent');
  const [fileTotal, setFileTotal] = useState(0),
    [readyCount, setReadyCount] = useState(0);
  const fileKey = [guest, filePage, fileQuery, fileSort, filePageSize].join('|');
  const [loadedFileKey, setLoadedFileKey] = useState('');
  const fileGeneration = useRef(0);
  useEffect(() => {
    setFilePage(1);
    setFileQuery('');
    setFileSort('recent');
  }, [view]);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileError, setFileError] = useState('');
  const [sessionError, setSessionError] = useState('');
  const [transferNotice, setTransferNotice] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const loadFiles = useCallback(
    async (signal?: AbortSignal) => {
      const current = ++fileGeneration.current;
      setLoading(true);
      setFileError('');
      try {
        let transfer = '';
        if (!guest) {
          try {
            const result = await claimGuestWorkspaces(signal);
            if (result.remaining)
              transfer =
                'Some guest files could not fit in your account. They remain available below until their listed expiry. Delete older account files, then refresh to move them into your account.';
          } catch {
            transfer =
              'Guest files could not be moved to your account yet. Refresh to retry; browser files remain available until their listed expiry.';
          }
        }
        const params = new URLSearchParams({
          page: String(filePage),
          pageSize: String(filePageSize),
          q: fileQuery,
          sort: fileSort,
        });
        const data = await (
          await (guest
            ? workspaceRequest(`?${params}`, { signal })
            : accountFetch(`/api/account/files?${params}`, {
                signal,
                headers: { 'x-folio-workspace': '1' },
              }))
        ).json();
        if (!signal?.aborted && current === fileGeneration.current) {
          setFiles(data.files);
          const total = data.total ?? data.files.length;
          setFileTotal(total);
          setReadyCount(
            data.readyCount ??
              data.files.filter((file: CloudDocument) => file.status === 'ready').length,
          );
          if (filePage > pageCount(total, filePageSize))
            setFilePage(pageCount(total, filePageSize));
          setStorage(data.storage || null);
          setTransferNotice(transfer);
        }
      } catch (error) {
        if (!signal?.aborted && current === fileGeneration.current)
          setFileError(error instanceof Error ? error.message : 'Your files could not be loaded.');
      } finally {
        if (!signal?.aborted && current === fileGeneration.current) {
          setLoadedFileKey(fileKey);
          setLoading(false);
        }
      }
    },
    [guest, filePage, fileQuery, fileSort, fileKey, filePageSize],
  );
  useEffect(() => {
    if (!sessionReady) return;
    const controller = new AbortController();
    const timer = setTimeout(() => void loadFiles(controller.signal), 180);
    const onFocus = () => void loadFiles(controller.signal);
    window.addEventListener('focus', onFocus);
    return () => {
      clearTimeout(timer);
      controller.abort();
      window.removeEventListener('focus', onFocus);
    };
  }, [loadFiles, sessionReady]);
  async function signOut() {
    setSigningOut(true);
    setSessionError('');
    try {
      if (guest) {
        await signOutGuest();
        return;
      }
      const result = await (await authClient())!.auth.signOut({ scope: 'local' });
      if (result.error) throw result.error;
      router.replace('/account');
    } catch {
      setSessionError('Sign-out could not finish. Please try again.');
      setSigningOut(false);
    }
  }
  const accountName = displayName(user?.user_metadata);
  const name = guest
    ? tr('Guest account')
    : accountName === 'Your account'
      ? tr('Your account')
      : accountName;
  const bytes = storage?.used ?? files.reduce((n, f) => n + f.size + (f.workspace_size || 0), 0);
  const capacity = storage ? storage.limit : access.pro ? PRO_STORAGE_LIMIT : FREE_STORAGE_LIMIT;
  const titles = {
    overview: guest
      ? tr('Your guest workspace.')
      : accountName === 'Your account'
        ? tr('Welcome back.')
        : tr('Welcome back, {name}.', { name: accountName.split(' ')[0] }),
    files: 'A home for your documents.',
    links: 'Good links. All together.',
    invoices: 'Good work, clearly billed.',
    billing: 'Your plan, your choice.',
    settings: 'Make yourself at home.',
    support: 'A little help, right here.',
  };
  const descriptions = {
    overview: 'Pick up where you left off, or start something new.',
    files: 'Private PDFs, ready whenever you need them.',
    links: 'Shorten a URL, share a QR code, and keep every link in one place.',
    invoices: 'Create an invoice, revisit a draft, and keep your billing details organized.',
    billing: 'Manage your subscription, payments, and invoices.',
    settings: 'Keep your profile up to date and manage your sessions.',
    support: 'Ask a question and follow your conversations with our team.',
  };
  return (
    <div className={s.dashboard}>
      <aside className={s.sidebar}>
        <Logo light href={href('/')} label={tr('Folio home')} />
        <p className={s.navLabel}>{tr('YOUR WORKSPACE')}</p>
        <nav ref={navigationRef} aria-label={tr('Dashboard navigation')} className={s.navigation}>
          {visibleNavigation.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              href={href(id === 'overview' ? '/dashboard' : `/dashboard?view=${id}`)}
              aria-current={view === id ? 'page' : undefined}
            >
              <Icon size={18} />
              <span>{tr(label)}</span>
              {id === 'files' && !loading && !fileError && <small>{readyCount}</small>}
            </Link>
          ))}
        </nav>
        <div className={s.sidebarBottom}>
          <div className={s.storage}>
            <Cloud size={19} />
            <strong>{tr('Private cloud storage')}</strong>
            <span>
              {fileError ? (
                tr('Storage unavailable')
              ) : loading && !storage ? (
                <>
                  <Skeleton width="86%" height={10} />
                  <LoadingLabel>{tr('Loading storage usage…')}</LoadingLabel>
                </>
              ) : capacity === null ? (
                tr('{used} used · Unlimited storage', { used: bytes ? formatBytes(bytes) : '0 KB' })
              ) : (
                tr('{used} of {capacity}', {
                  used: bytes ? formatBytes(bytes) : '0 KB',
                  capacity: storageLabel(capacity),
                })
              )}
            </span>
            {capacity !== null && (
              <progress
                aria-label={tr('Cloud storage used')}
                value={Math.min(bytes, capacity)}
                max={capacity}
              />
            )}
            {!loading && !fileError && capacity !== null && bytes >= capacity && (
              <span>{tr('Storage full. Delete older files to upload more.')}</span>
            )}
            <Link href={href('/dashboard?view=files')}>
              {tr('Manage files')} <ArrowRight size={14} />
            </Link>
          </div>
          {guest && (
            <Link className={s.guestSignIn} href={signInHref(href(`/dashboard?view=${view}`))}>
              <ArrowUpRight size={16} /> {tr('Sign in to keep your files')}
            </Link>
          )}
        </div>
      </aside>
      <div className={s.mainColumn}>
        <header className={s.topbar} aria-label={tr('Workspace navigation')}>
          <div className={s.topbarLogo}>
            <Logo light href={href('/')} label={tr('Folio home')} />
          </div>
          <span className={s.breadcrumb}>
            {tr('My workspace')} <span className={s.crumb}>/</span>{' '}
            <strong>{tr(navigation.find((n) => n.id === view)?.label ?? '')}</strong>
          </span>
          <nav className={s.topbarActions} aria-label={tr('Account navigation')}>
            <LanguageSelector
              label={tr('Language')}
              query={view === 'overview' ? '' : `view=${view}`}
            />
            <Link
              href={href('/tools')}
              className={s.toolsLink}
              aria-label={tr('All PDF tools')}
              title={tr('All PDF tools')}
            >
              <FileText size={18} aria-hidden="true" />
              <span>{tr('All PDF tools')}</span>
            </Link>
            {access.admin && (
              <Link
                href={href('/admin')}
                className={s.adminLink}
                aria-label={tr('Super admin dashboard')}
                title={tr('Super admin dashboard')}
              >
                <ShieldCheck size={18} aria-hidden="true" />
                <span>{tr('Admin')}</span>
              </Link>
            )}
            <Menu.Root modal={false}>
              <Menu.Trigger
                className={s.profile}
                aria-label={tr('{value0} — account menu', { value0: name })}
              >
                <span className={s.avatar} aria-hidden="true">
                  {guest ? <UserRound size={19} /> : name.slice(0, 1).toUpperCase()}
                </span>
                <span className={s.profileCopy}>
                  <strong>{name}</strong>
                  <small>{!FREE_LAUNCH && access.pro ? tr('Folio Pro') : tr('Folio Free')}</small>
                </span>
                <ChevronDown size={16} className={s.profileChevron} aria-hidden="true" />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner
                  className={s.accountMenuPositioner}
                  align="end"
                  sideOffset={10}
                  collisionPadding={12}
                >
                  <Menu.Popup className={s.accountMenu} aria-label={tr('Account menu')}>
                    <div className={s.accountMenuIdentity}>
                      <strong>{name}</strong>
                      <small>
                        {!FREE_LAUNCH && access.pro ? tr('Folio Pro') : tr('Folio Free')}
                      </small>
                    </div>
                    <Menu.LinkItem
                      className={s.accountMenuItem}
                      render={<Link href={href('/dashboard?view=settings')} />}
                      closeOnClick
                    >
                      <Settings size={18} aria-hidden="true" />
                      {tr('Profile settings')}
                    </Menu.LinkItem>
                    <Menu.Separator className={s.accountMenuSeparator} />
                    <Menu.Item
                      className={s.accountMenuItem}
                      render={<button type="button" />}
                      nativeButton
                      closeOnClick={false}
                      disabled={signingOut}
                      aria-describedby={guest ? 'guest-session-details' : undefined}
                      onClick={() => void signOut()}
                    >
                      <LogOut size={18} aria-hidden="true" />
                      {signingOut ? tr('Signing out…') : tr('Sign out')}
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </nav>
        </header>
        <main id="main" className={s.content}>
          <div className={`${s.heading} page-heading page-heading--workspace`}>
            <div>
              <span className={`${s.eyebrow} eyebrow`}>
                {view === 'overview' ? tr('A LITTLE MORE ORGANIZED') : tr('YOUR FOLIO')}
              </span>
              <h1>{tr(titles[view])}</h1>
              <p>{tr(descriptions[view])}</p>
            </div>
            {view === 'overview' && (
              <Link className="button primary" href={href('/workspace')}>
                <Plus size={17} /> {tr('Edit a PDF')}
              </Link>
            )}
          </div>
          {guest && !['links', 'invoices'].includes(view) && (
            <div className={s.guestNotice}>
              <div>
                <strong>{tr(FREE_LAUNCH ? '1 GB, ready to use.' : '100 MB, ready to use.')}</strong>
                <p id="guest-session-details">
                  {tr(
                    'Your files are private to this browser and expire 24 hours after upload. Sign in before they expire to keep them in your account. Signing out or clearing your browser cookies removes access to guest files.',
                  )}
                </p>
              </div>
              <Link className="button secondary" href={signInHref(href(`/dashboard?view=${view}`))}>
                {tr('Sign in')} <ArrowUpRight size={16} />
              </Link>
            </div>
          )}
          {transferNotice && (
            <p className="service-note" role="status">
              {tr(transferNotice)}
            </p>
          )}
          {adminRequired && user && !access.admin && (
            <p role="status" className={s.notice}>
              {tr(
                'You’re signed in, but this account does not have super admin access. Your PDF tools are still available.',
              )}
            </p>
          )}
          {(accountError || sessionError) && (
            <p role="alert" className="error-message">
              {tr(sessionError || accountError)}
            </p>
          )}
          {view === 'overview' && (
            <>
              <div className={s.metrics}>
                <Link href={href('/dashboard?view=files')}>
                  <span className={s.metricIcon}>
                    <FolderOpen size={21} />
                  </span>
                  <div>
                    <span>{tr('Saved PDFs')}</span>
                    <strong>
                      {loading && !storage ? (
                        <Skeleton width={35} height="1em" />
                      ) : fileError ? (
                        '—'
                      ) : (
                        readyCount
                      )}
                    </strong>
                    <small>{tr('In your private cloud')}</small>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
                <Link href={href(FREE_LAUNCH ? '/tools' : '/dashboard?view=billing')}>
                  <span className={s.metricIcon}>
                    <CreditCard size={21} />
                  </span>
                  <div>
                    <span>{tr(FREE_LAUNCH ? 'Your tools' : 'Your plan')}</span>
                    <strong>
                      {accountLoading ? (
                        <Skeleton width={110} height="1em" />
                      ) : accountError ? (
                        tr('Unavailable')
                      ) : FREE_LAUNCH ? (
                        tr('All tools are free')
                      ) : access.pro ? (
                        'Folio Pro'
                      ) : (
                        tr('Folio Free')
                      )}
                    </strong>
                    <small>
                      {FREE_LAUNCH
                        ? tr('No subscription needed')
                        : access.trial
                          ? tr('Introductory period')
                          : access.cancelAtPeriodEnd
                            ? tr('Cancellation scheduled')
                            : tr('Manage your membership')}
                    </small>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
                <Link href={href('/dashboard?view=settings')}>
                  <span className={s.metricIcon}>
                    <ShieldCheck size={21} />
                  </span>
                  <div>
                    <span>{tr('Account')}</span>
                    <strong>{guest ? tr('This browser.') : tr('All yours.')}</strong>
                    <small>
                      {guest ? tr('Guest access · 24 hours') : tr('Profile & sign-in settings')}
                    </small>
                  </div>
                  <ArrowUpRight size={16} />
                </Link>
              </div>
              <section className={s.quickCard}>
                <div>
                  <span className={`${s.eyebrow} eyebrow`}>{tr('FROM TO-DO TO DONE')}</span>
                  <h2>{tr('Good work starts with a PDF.')}</h2>
                  <p>{tr('Edit a proposal, fill a form, or bring a few files together.')}</p>
                </div>
                <div className={s.quickLinks}>
                  <Link href={href('/workspace')}>
                    <FileText size={20} /> {tr('Edit PDF')} <ArrowUpRight size={16} />
                  </Link>
                  <Link href={href('/forms')}>
                    {tr('Fill a form')} <ArrowUpRight size={16} />
                  </Link>
                  <Link href={href('/merge-pdf')}>
                    {tr('Merge PDFs')} <ArrowUpRight size={16} />
                  </Link>
                  <Link href={href('/dashboard?view=links')}>
                    {tr('Shorten a link')} <ArrowUpRight size={16} />
                  </Link>
                </div>
              </section>
            </>
          )}
          {(view === 'overview' || view === 'files') && (
            <CloudFiles
              key={view}
              files={files}
              pageSize={filePageSize}
              onPageSizeChange={(size) => {
                setFilePageSize(size);
                setFilePage(1);
              }}
              page={filePage}
              total={fileTotal}
              onPageChange={setFilePage}
              query={fileQuery}
              sort={fileSort}
              onQueryChange={(value) => {
                setFileQuery(value);
                setFilePage(1);
              }}
              onSortChange={(value) => {
                setFileSort(value);
                setFilePage(1);
              }}
              storage={
                storage ?? {
                  used: bytes,
                  limit: capacity,
                  available: capacity === null ? null : Math.max(0, capacity - bytes),
                  full: capacity !== null && bytes >= capacity,
                  recovery: [],
                }
              }
              loading={loading || loadedFileKey !== fileKey}
              error={fileError}
              refresh={loadFiles}
              compact={view === 'overview'}
              guest={guest}
            />
          )}
          {view === 'links' && <ShortLinks manage />}
          {view === 'invoices' && <InvoiceLibrary />}
          {view === 'billing' &&
            (guest ? (
              <GuestAccount view="billing" />
            ) : (
              <DashboardBilling checkoutSuccess={checkoutSuccess} />
            ))}
          {view === 'settings' &&
            (guest ? <GuestAccount view="settings" /> : <DashboardSettings />)}
          {view === 'support' && (
            <div className={s.support}>
              <SupportPanel />
            </div>
          )}
          <footer className={s.footer}>
            <span>{tr('Made for the work that matters.')}</span>
            <Link href={href('/dashboard?view=support')}>
              {tr('Need a hand?')} <ArrowUpRight size={14} />
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}

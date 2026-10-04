'use client';
import { FREE_LAUNCH } from '@/lib/access-policy';
import { useUiTranslation, useUiLocale } from './ui-language';
import { localizedHref } from '@/lib/i18n/translate';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Link2,
  Pencil,
  Plus,
  QrCode,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAccount } from './account-provider';
import { accountFetch } from '@/lib/auth-client';
import { signInHref } from '@/lib/auth-navigation';
import {
  FREE_LINK_LIMIT,
  PRO_LINK_LIMIT,
  type ShortLink,
  type LinkListing,
} from '@/lib/short-links';
import { PAGE_SIZE, pageCount } from '@/lib/pagination.mjs';
import { friendlyError } from '@/lib/utils';
import { Pagination } from './pagination';
import { ShortLinkQr } from './short-link-qr';
import s from './short-links.module.css';

export function ShortLinks({ manage = false }: { manage?: boolean }) {
  const tr = useUiTranslation();

  const { user, loading } = useAccount();
  if (loading && !user)
    return (
      <div className={s.card} role="status">
        {tr('Loading your account…')}
      </div>
    );
  return <LinkWorkspace key={user?.id || 'guest'} manage={manage} />;
}

function LinkWorkspace({ manage }: { manage: boolean }) {
  const tr = useUiTranslation();
  const locale = useUiLocale();
  const href = (path: string) => localizedHref(locale, path);

  const { user, access, loading, error: accountError } = useAccount();
  const [destination, setDestination] = useState('');
  const [title, setTitle] = useState('');
  const [alias, setAlias] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ShortLink | null>(null);
  const [version, setVersion] = useState(0);
  const limit = access.pro ? PRO_LINK_LIMIT : FREE_LINK_LIMIT;
  async function create(event: FormEvent) {
    event.preventDefault();
    if (busy || !user) return;
    setBusy(true);
    setError('');
    try {
      const { link } = await (
        await accountFetch('/api/account/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination, title, alias: access.pro ? alias : '' }),
        })
      ).json();
      setResult(link);
      setVersion((v) => v + 1);
      setDestination('');
      setTitle('');
      setAlias('');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.workspace}>
      <section className={s.composer} aria-labelledby="shorten-heading">
        <div className={s.formPanel}>
          <div className={s.heading}>
            <span className={s.symbol}>
              <Link2 size={23} />
            </span>
            <div>
              <h2 id="shorten-heading">{tr('A long link. A little simpler.')}</h2>
              <p>{tr('Paste, shorten, and share in seconds.')}</p>
            </div>
          </div>
          <form onSubmit={create}>
            <fieldset disabled={busy || loading || !user} className={s.fields}>
              <label>
                {tr('Destination URL')}
                <input
                  name="destination"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://example.com/your-long-link"
                  required
                  maxLength={2048}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </label>
              <div className={s.fieldRow}>
                <label>
                  {tr('Title')} <span className={s.optional}>{tr('(optional)')}</span>
                  <input
                    name="title"
                    placeholder={tr('A name to find it later')}
                    maxLength={100}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label>
                  {tr('Custom alias')} {!FREE_LAUNCH && <span className={s.pro}>{tr('PRO')}</span>}
                  <input
                    name="alias"
                    placeholder={access.pro ? tr('my-link') : tr('Available with Pro')}
                    disabled={!access.pro}
                    aria-describedby="alias-hint"
                    maxLength={48}
                    minLength={3}
                    pattern="[a-zA-Z0-9][a-zA-Z0-9-]{1,46}[a-zA-Z0-9]"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value.toLowerCase())}
                  />
                </label>
              </div>
              <p id="alias-hint" className={s.hint}>
                {access.pro
                  ? tr(
                      'Leave the alias blank for a random link, or choose 3–48 letters, numbers, or hyphens. Aliases cannot be changed or reused.',
                    )
                  : tr('Free links get a random alias. Choose your own with Folio Pro.')}
              </p>
            </fieldset>
            <div className={s.formFooter}>
              {user ? (
                <button className="button primary" disabled={busy || loading || !!accountError}>
                  <Plus size={18} />
                  {busy ? tr('Creating link…') : tr('Shorten link')}
                </button>
              ) : (
                <Link
                  className="button primary"
                  href={signInHref(href(manage ? '/dashboard?view=links' : '/url-shortener'))}
                >
                  {tr('Sign in to shorten')} <ArrowUpRight size={17} />
                </Link>
              )}
              <span>
                {user
                  ? tr('Automatically saved to My links.')
                  : tr('A free account keeps your links together.')}
              </span>
            </div>
            {(error || accountError) && (
              <p className="error-message" role="alert">
                {tr(error || accountError)}
              </p>
            )}
          </form>
        </div>
        <aside className={s.planPanel}>
          <span className="eyebrow">{tr('SMALL LINKS. MORE POSSIBILITIES.')}</span>
          <h3>{tr('Made to be shared.')}</h3>
          <ul>
            <li>
              <Check size={17} />
              {tr('{count} saved links on {plan}', {
                count: limit.toLocaleString(locale),
                plan: !FREE_LAUNCH && access.pro ? 'Pro' : tr('Free'),
              })}
            </li>
            <li>
              <Check size={17} />
              {tr('QR downloads in PNG and SVG')}
            </li>
            <li>
              <Check size={17} />
              {tr('Your links, on every signed-in device')}
            </li>
          </ul>
          <p>
            {access.pro
              ? tr(
                  'Choose a memorable alias and update destinations without changing the link or QR code.',
                )
              : tr('Pro adds custom aliases, editable destinations, and room for 1,000 links.')}
          </p>
          <Link href={href(access.pro ? '/dashboard?view=links' : '/pricing')}>
            {access.pro ? tr('Manage your links') : tr('Compare plans')}
            <ArrowRight size={17} />
          </Link>
        </aside>
      </section>
      {result && (
        <section className={s.card} aria-label={tr('New short link')}>
          <p className={s.success} role="status">
            <Check size={17} />
            {tr('Your link is ready and saved.')}
          </p>
          <LinkDetails link={result} />
        </section>
      )}
      {manage && user ? (
        <SavedLinks
          key={user.id}
          version={version}
          onDeleted={(id) => {
            if (result?.id === id) setResult(null);
          }}
          onUpdated={(link) => {
            if (result?.id === link.id) setResult(link);
          }}
        />
      ) : (
        !manage &&
        user && (
          <Link className={s.manageLink} href={href('/dashboard?view=links')}>
            {tr('Open My links')} <ArrowUpRight size={17} />
          </Link>
        )
      )}
      <p className={s.privacy}>
        {tr(
          'Your list is private. Anyone with a short link or QR code can open its destination. Deleting a link stops both from working.',
        )}
      </p>
    </div>
  );
}

function LinkDetails({ link }: { link: ShortLink }) {
  const tr = useUiTranslation();

  const [qr, setQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link.shortUrl);
      setCopied(true);
      setError('');
    } catch {
      setError('Copy is unavailable in this browser. Select and copy the short link above.');
    }
  }
  return (
    <>
      <div className={s.linkDetails}>
        <div className={s.linkCopy}>
          <strong>{link.title || new URL(link.destination).hostname}</strong>
          <a className={s.shortUrl} href={link.shortUrl} target="_blank" rel="noopener noreferrer">
            {link.shortUrl}
            <ArrowUpRight size={16} />
          </a>
          <p className={s.destination}>{link.destination}</p>
        </div>
        <div className={s.actions}>
          <button className="button secondary" onClick={() => void copy()}>
            <Copy size={16} />
            <span>{copied ? tr('Copied!') : tr('Copy link')}</span>
          </button>
          <button className="button secondary" aria-expanded={qr} onClick={() => setQr(!qr)}>
            <QrCode size={16} />
            {qr ? tr('Hide QR') : tr('Generate QR')}
          </button>
        </div>
      </div>
      <span className="sr-only" role="status">
        {copied ? tr('Short link copied to clipboard.') : ''}
      </span>
      {error && (
        <p className="error-message" role="alert">
          {tr(error)}
        </p>
      )}
      {qr && <ShortLinkQr url={link.shortUrl} alias={link.alias} />}
    </>
  );
}

function SavedLinks({
  version,
  onDeleted,
  onUpdated,
}: {
  version: number;
  onDeleted: (id: string) => void;
  onUpdated: (link: ShortLink) => void;
}) {
  const tr = useUiTranslation();
  const locale = useUiLocale();

  const { access } = useAccount();
  const [listing, setListing] = useState<LinkListing | null>(null);
  const [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(PAGE_SIZE),
    [query, setQuery] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [edit, setEdit] = useState<ShortLink | null>(null),
    [remove, setRemove] = useState<ShortLink | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          q: query,
        });
        const data: LinkListing = await (
          await accountFetch(`/api/account/links?${params}`, { signal: controller.signal })
        ).json();
        if (!controller.signal.aborted) {
          setListing(data);
          if (page > pageCount(data.total, pageSize)) setPage(pageCount(data.total, pageSize));
        }
      } catch (err) {
        if (!controller.signal.aborted) setError(friendlyError(err));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, pageSize, query, refresh, version]);
  return (
    <section className={s.card} aria-labelledby="saved-links-heading">
      <div className={s.listHeading}>
        <div>
          <h2 id="saved-links-heading">{tr('My links')}</h2>
          <p>
            {listing
              ? tr('{value0} of {value1} saved links', {
                  value0: listing.used.toLocaleString(locale),
                  value1: listing.limit.toLocaleString(locale),
                })
              : tr('Your saved links, all in one place.')}
          </p>
        </div>
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => setRefresh((v) => v + 1)}
        >
          {tr('Refresh')}
        </button>
      </div>
      <label className={s.search}>
        <Search size={18} />
        <span className="sr-only">{tr('Search saved links')}</span>
        <input
          type="search"
          placeholder={tr('Search by title, alias, or destination')}
          maxLength={120}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </label>
      {notice && (
        <p className="pro-notice" role="status">
          {tr(notice)}
        </p>
      )}
      {error ? (
        <p className="error-message" role="alert">
          {tr(error)}
        </p>
      ) : loading ? (
        <p className={s.empty} role="status">
          {tr('Loading links…')}
        </p>
      ) : !listing?.links.length ? (
        <div className={s.empty}>
          <Link2 size={28} />
          <h3>{query ? tr('No matching links.') : tr('Your first link starts above.')}</h3>
          <p>
            {query
              ? tr('Try a different title, alias, or website.')
              : tr('Create a short link and it will be saved here automatically.')}
          </p>
        </div>
      ) : (
        <div className={s.list}>
          {listing.links.map((link) => (
            <article key={link.id} className={s.savedLink}>
              <LinkDetails link={link} />
              <div className={s.rowFooter}>
                <span>
                  {link.custom ? tr('Custom alias') : tr('Random alias')} ·{' '}
                  {new Date(link.created_at).toLocaleDateString(locale, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <div className={s.actions}>
                  <button
                    className="button secondary"
                    aria-label={tr('Edit {value0}', { value0: link.title || link.alias })}
                    onClick={() => setEdit(link)}
                  >
                    <Pencil size={15} />
                    {tr('Edit')}
                  </button>
                  <button
                    className="button secondary"
                    aria-label={tr('Delete {value0}', { value0: link.title || link.alias })}
                    onClick={() => setRemove(link)}
                  >
                    <Trash2 size={15} />
                    {tr('Delete')}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {listing && (
        <Pagination
          page={page}
          total={listing.total}
          pageSize={pageSize}
          onChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          disabled={loading}
          label={tr('Saved links pagination')}
        />
      )}
      {edit && (
        <LinkDialog
          link={edit}
          pro={access.pro}
          onClose={() => setEdit(null)}
          onSaved={(link) => {
            setEdit(null);
            onUpdated(link);
            setRefresh((v) => v + 1);
            setNotice('Link updated. Its address and QR code stay the same.');
          }}
        />
      )}
      {remove && (
        <LinkDialog
          link={remove}
          deleting
          pro={access.pro}
          onClose={() => setRemove(null)}
          onSaved={() => {
            setRemove(null);
            onDeleted(remove.id);
            setRefresh((v) => v + 1);
            setNotice('Link deleted. Its address and QR code no longer work.');
          }}
        />
      )}
    </section>
  );
}

function LinkDialog({
  link,
  deleting = false,
  pro,
  onClose,
  onSaved,
}: {
  link: ShortLink;
  deleting?: boolean;
  pro: boolean;
  onClose: () => void;
  onSaved: (link: ShortLink) => void;
}) {
  const tr = useUiTranslation();
  const locale = useUiLocale();
  const href = (path: string) => localizedHref(locale, path);

  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(link.title),
    [destination, setDestination] = useState(link.destination);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await accountFetch(`/api/account/links/${link.id}`, {
        method: deleting ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        ...(deleting ? {} : { body: JSON.stringify({ title, destination }) }),
      });
      onSaved(deleting ? link : (await response.json()).link);
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby="link-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-header">
        <h2 id="link-dialog-title">{deleting ? tr('Delete this link?') : tr('Edit saved link')}</h2>
        <button
          className="icon-button"
          aria-label={tr('Close dialog')}
          disabled={busy}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <form className="dialog-form" onSubmit={save}>
        <div className="dialog-body">
          {deleting ? (
            <p>
              {tr('Deleting')} <strong>{link.title || link.alias}</strong>{' '}
              {tr(
                'stops its short link and QR code from working. This cannot be undone, and the alias cannot be reused.',
              )}
            </p>
          ) : (
            <fieldset className={s.fields} disabled={busy}>
              <label>
                {tr('Title')}
                <input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label>
                {tr('Destination URL')}
                <input
                  value={destination}
                  required
                  maxLength={2048}
                  disabled={!pro}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </label>
              <p className={s.hint}>
                {pro
                  ? tr('Updating the destination keeps the same short link and QR code.')
                  : tr('Renaming is free. Changing the destination requires Folio Pro.')}
              </p>
              {!pro && (
                <Link className="text-link" href={href('/pricing')}>
                  {tr('Explore Pro')} <ArrowUpRight size={15} />
                </Link>
              )}
            </fieldset>
          )}
          {error && (
            <p className="error-message" role="alert">
              {tr(error)}
            </p>
          )}
        </div>
        <div className="dialog-footer">
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
            {tr('Cancel')}
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? tr('Saving…') : deleting ? tr('Delete link') : tr('Save changes')}
          </button>
        </div>
      </form>
    </dialog>
  );
}

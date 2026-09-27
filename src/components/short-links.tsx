'use client';
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
  const { user, loading } = useAccount();
  if (loading && !user)
    return (
      <div className={s.card} role="status">
        Loading your account…
      </div>
    );
  return <LinkWorkspace key={user?.id || 'guest'} manage={manage} />;
}

function LinkWorkspace({ manage }: { manage: boolean }) {
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
              <h2 id="shorten-heading">A long link. A little simpler.</h2>
              <p>Paste, shorten, and share in seconds.</p>
            </div>
          </div>
          <form onSubmit={create}>
            <fieldset disabled={busy || loading || !user} className={s.fields}>
              <label>
                Destination URL
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
                  Title <span className={s.optional}>(optional)</span>
                  <input
                    name="title"
                    placeholder="A name to find it later"
                    maxLength={100}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label>
                  Custom alias <span className={s.pro}>PRO</span>
                  <input
                    name="alias"
                    placeholder={access.pro ? 'my-link' : 'Available with Pro'}
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
                  ? 'Leave the alias blank for a random link, or choose 3–48 letters, numbers, or hyphens. Aliases cannot be changed or reused.'
                  : 'Free links get a random alias. Choose your own with Folio Pro.'}
              </p>
            </fieldset>
            <div className={s.formFooter}>
              {user ? (
                <button className="button primary" disabled={busy || loading || !!accountError}>
                  <Plus size={18} />
                  {busy ? 'Creating link…' : 'Shorten link'}
                </button>
              ) : (
                <Link
                  className="button primary"
                  href={signInHref(manage ? '/dashboard?view=links' : '/url-shortener')}
                >
                  Sign in to shorten <ArrowUpRight size={17} />
                </Link>
              )}
              <span>
                {user
                  ? 'Automatically saved to My links.'
                  : 'A free account keeps your links together.'}
              </span>
            </div>
            {(error || accountError) && (
              <p className="error-message" role="alert">
                {error || accountError}
              </p>
            )}
          </form>
        </div>
        <aside className={s.planPanel}>
          <span className="eyebrow">SMALL LINKS. MORE POSSIBILITIES.</span>
          <h3>Made to be shared.</h3>
          <ul>
            <li>
              <Check size={17} />
              {limit.toLocaleString()} saved links on {access.pro ? 'Pro' : 'Free'}
            </li>
            <li>
              <Check size={17} />
              QR downloads in PNG and SVG
            </li>
            <li>
              <Check size={17} />
              Your links, on every signed-in device
            </li>
          </ul>
          <p>
            {access.pro
              ? 'Choose a memorable alias and update destinations without changing the link or QR code.'
              : 'Pro adds custom aliases, editable destinations, and room for 1,000 links.'}
          </p>
          <Link href={access.pro ? '/dashboard?view=links' : '/pricing'}>
            {access.pro ? 'Manage your links' : 'Compare plans'}
            <ArrowRight size={17} />
          </Link>
        </aside>
      </section>
      {result && (
        <section className={s.card} aria-label="New short link">
          <p className={s.success} role="status">
            <Check size={17} />
            Your link is ready and saved.
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
          <Link className={s.manageLink} href="/dashboard?view=links">
            Open My links <ArrowUpRight size={17} />
          </Link>
        )
      )}
      <p className={s.privacy}>
        Your list is private. Anyone with a short link or QR code can open its destination. Deleting
        a link stops both from working.
      </p>
    </div>
  );
}

function LinkDetails({ link }: { link: ShortLink }) {
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
            <span>{copied ? 'Copied!' : 'Copy link'}</span>
          </button>
          <button className="button secondary" aria-expanded={qr} onClick={() => setQr(!qr)}>
            <QrCode size={16} />
            {qr ? 'Hide QR' : 'Generate QR'}
          </button>
        </div>
      </div>
      <span className="sr-only" role="status">
        {copied ? 'Short link copied to clipboard.' : ''}
      </span>
      {error && (
        <p className="error-message" role="alert">
          {error}
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
          <h2 id="saved-links-heading">My links</h2>
          <p>
            {listing
              ? `${listing.used.toLocaleString()} of ${listing.limit.toLocaleString()} saved links`
              : 'Your saved links, all in one place.'}
          </p>
        </div>
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => setRefresh((v) => v + 1)}
        >
          Refresh
        </button>
      </div>
      <label className={s.search}>
        <Search size={18} />
        <span className="sr-only">Search saved links</span>
        <input
          type="search"
          placeholder="Search by title, alias, or destination"
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
          {notice}
        </p>
      )}
      {error ? (
        <p className="error-message" role="alert">
          {error}
        </p>
      ) : loading ? (
        <p className={s.empty} role="status">
          Loading links…
        </p>
      ) : !listing?.links.length ? (
        <div className={s.empty}>
          <Link2 size={28} />
          <h3>{query ? 'No matching links.' : 'Your first link starts above.'}</h3>
          <p>
            {query
              ? 'Try a different title, alias, or website.'
              : 'Create a short link and it will be saved here automatically.'}
          </p>
        </div>
      ) : (
        <div className={s.list}>
          {listing.links.map((link) => (
            <article key={link.id} className={s.savedLink}>
              <LinkDetails link={link} />
              <div className={s.rowFooter}>
                <span>
                  {link.custom ? 'Custom alias' : 'Random alias'} ·{' '}
                  {new Date(link.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <div className={s.actions}>
                  <button
                    className="button secondary"
                    aria-label={`Edit ${link.title || link.alias}`}
                    onClick={() => setEdit(link)}
                  >
                    <Pencil size={15} />
                    Edit
                  </button>
                  <button
                    className="button secondary"
                    aria-label={`Delete ${link.title || link.alias}`}
                    onClick={() => setRemove(link)}
                  >
                    <Trash2 size={15} />
                    Delete
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
          label="Saved links pagination"
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
        <h2 id="link-dialog-title">{deleting ? 'Delete this link?' : 'Edit saved link'}</h2>
        <button className="icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <form className="dialog-form" onSubmit={save}>
        <div className="dialog-body">
          {deleting ? (
            <p>
              Deleting <strong>{link.title || link.alias}</strong> stops its short link and QR code
              from working. This cannot be undone, and the alias cannot be reused.
            </p>
          ) : (
            <fieldset className={s.fields} disabled={busy}>
              <label>
                Title
                <input value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label>
                Destination URL
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
                  ? 'Updating the destination keeps the same short link and QR code.'
                  : 'Renaming is free. Changing the destination requires Folio Pro.'}
              </p>
              {!pro && (
                <Link className="text-link" href="/pricing">
                  Explore Pro <ArrowUpRight size={15} />
                </Link>
              )}
            </fieldset>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-footer">
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Saving…' : deleting ? 'Delete link' : 'Save changes'}
          </button>
        </div>
      </form>
    </dialog>
  );
}

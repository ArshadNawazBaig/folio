'use client';
import { FREE_LAUNCH } from '@/lib/access-policy';
import { useUiTranslation, useLocalizedHref, useUiLocale } from '@/components/ui-language';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Menu } from '@base-ui/react/menu';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ClipboardList,
  Crown,
  Download,
  FilePlus2,
  FileText,
  FolderOpen,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  Plus,
  Palette,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAccount } from './account-provider';
import { DownloadGate } from './download-gate';
import { Dropdown } from './dropdown';
import { DatePicker } from './date-picker';
import { ConfirmDialog } from './confirm-dialog';
import { InvoicePreview } from './invoice-preview';
import { InvoiceDesignThumbnail } from './invoice-design-thumbnail';
import { proInvoiceDesignCount } from '@/lib/invoice-designs';
import { Logo } from './logo';
import { accountFetch, toolDownloadFetch } from '@/lib/auth-client';
import { signInHref } from '@/lib/auth-navigation';
import { download } from '@/lib/utils';
import {
  dueAfter,
  freeInvoice,
  invoiceColors,
  invoiceCurrencies,
  invoiceFilename,
  invoiceIssues,
  invoiceMoney,
  invoiceProFeatures,
  invoiceSchema,
  invoiceTemplates,
  invoiceTotals,
  localInvoiceDate,
  newInvoice,
  sampleInvoice,
  type Invoice,
  type SavedInvoice,
} from '@/lib/invoice';
import s from './invoice-generator.module.css';

const tabs = ['Details', 'Items', 'Payment & notes', 'Design'] as const;
type DraftAction =
  | { kind: 'leave'; href: string }
  | { kind: 'new' | 'sample' }
  | { kind: 'import'; document: Invoice };
const draftConfirmations = {
  leave: {
    title: 'Leave this invoice?',
    description:
      'Your unsaved changes will be lost. Keep editing or download an editable draft backup before you leave.',
    confirmLabel: 'Leave invoice',
  },
  new: {
    title: 'Start a new invoice?',
    description:
      'This will replace your current draft with a blank invoice. Download a draft backup first if you want to keep your unsaved changes.',
    confirmLabel: 'Start new invoice',
  },
  sample: {
    title: 'Replace with the sample?',
    description:
      'The sample will replace your current draft. Download a draft backup first if you want to keep your unsaved changes.',
    confirmLabel: 'Load sample',
  },
  import: {
    title: 'Import this draft?',
    description:
      'The imported file will replace your current draft. Download a draft backup first if you want to keep your unsaved changes.',
    confirmLabel: 'Import draft',
  },
};
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const tr = useUiTranslation();

  return (
    <label className={s.field}>
      <span>{tr(label)}</span>
      {children}
      {hint && <small>{tr(hint)}</small>}
    </label>
  );
}
function ProBadge() {
  const tr = useUiTranslation();
  if (FREE_LAUNCH) return null;

  return (
    <span className={s.proBadge}>
      <Crown size={10} /> {tr('PRO')}
    </span>
  );
}
export function InvoiceGenerator() {
  const tr = useUiTranslation();
  const href = useLocalizedHref();
  const locale = useUiLocale();
  const currencyOptions = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: 'currency' });
    return Object.keys(invoiceCurrencies).map((value) => ({
      value,
      label: `${value} · ${names.of(value) || value}`,
    }));
  }, [locale]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoice');
  const { user, access, loading } = useAccount();
  const userId = user?.id;
  const [invoice, setInvoice] = useState<Invoice>(() => newInvoice());
  const [ready, setReady] = useState(false),
    [tab, setTab] = useState(0),
    [mobilePreview, setMobilePreview] = useState(false);
  const [busy, setBusy] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [showIssues, setShowIssues] = useState(false);
  const [saved, setSaved] = useState<{ id: string; revision: number; snapshot: string } | null>(
    null,
  );
  const [gate, setGate] = useState(false),
    [upgrade, setUpgrade] = useState(false);
  const [draftAction, setDraftAction] = useState<DraftAction | null>(null);
  const leavingPage = useRef(false);
  const logoInput = useRef<HTMLInputElement>(null),
    draftInput = useRef<HTMLInputElement>(null),
    formScroll = useRef<HTMLDivElement>(null);
  const pending = useRef<AbortController | null>(null),
    account = useRef(user?.id),
    loadedId = useRef('');
  const [blankSnapshot, setBlankSnapshot] = useState(() => JSON.stringify(newInvoice()));
  const totals = invoiceTotals(invoice),
    proFeatures = invoiceProFeatures(invoice),
    issues = invoiceIssues(invoice, tr);
  const dirty = saved
    ? saved.snapshot !== JSON.stringify(invoice)
    : blankSnapshot !== JSON.stringify(invoice);
  useEffect(() => {
    const blank = newInvoice(localInvoiceDate());
    setBlankSnapshot(JSON.stringify(blank));
    setInvoice(blank);
    setReady(true);
  }, []);
  useEffect(() => {
    formScroll.current?.scrollTo({ top: 0 });
  }, [tab]);
  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => {
      if (dirty && !leavingPage.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const pageShown = () => {
      leavingPage.current = false;
    };
    window.addEventListener('beforeunload', listener);
    window.addEventListener('pageshow', pageShown);
    return () => {
      window.removeEventListener('beforeunload', listener);
      window.removeEventListener('pageshow', pageShown);
    };
  }, [dirty]);
  useEffect(() => {
    if (account.current && account.current !== user?.id) {
      pending.current?.abort();
      const blank = newInvoice(localInvoiceDate());
      setBlankSnapshot(JSON.stringify(blank));
      setInvoice(blank);
      setSaved(null);
      loadedId.current = '';
      setNotice('');
      setError('');
      setBusy('');
      setDraftAction(null);
    }
    account.current = user?.id;
  }, [user?.id]);
  useEffect(() => {
    if (!ready) return;
    const id = invoiceId;
    if (!id || loadedId.current === `${userId}:${id}`) return;
    if (!userId) {
      setNotice('Sign in to reopen this saved invoice. You can still create a new invoice below.');
      return;
    }
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      setError('This saved invoice link is invalid.');
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy('Opening invoice…');
    void accountFetch(`/api/account/invoices/${id}`, { signal: controller.signal })
      .then((response) => response.json())
      .then(({ invoice: value }: { invoice: SavedInvoice }) => {
        if (controller.signal.aborted) return;
        loadedId.current = `${userId}:${id}`;
        const doc = invoiceSchema.parse(value.document);
        setInvoice(doc);
        setSaved({ id: value.id, revision: value.revision, snapshot: JSON.stringify(doc) });
        setNotice('Saved invoice opened. Changes are saved only when you choose Save to account.');
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy('');
      });
    return () => controller.abort();
  }, [ready, userId, invoiceId]);
  useEffect(() => () => pending.current?.abort(), []);
  function confirmExit(event: MouseEvent<HTMLElement>) {
    if (
      !dirty ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (
      !(link instanceof HTMLAnchorElement) ||
      (link.target && link.target !== '_self') ||
      link.hasAttribute('download') ||
      !['http:', 'https:'].includes(link.protocol)
    )
      return;
    const destination = new URL(link.href);
    if (
      destination.origin === window.location.origin &&
      destination.pathname === window.location.pathname &&
      destination.search === window.location.search
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    if (!draftAction) setDraftAction({ kind: 'leave', href: destination.href });
  }
  function patch<K extends keyof Invoice>(key: K, value: Invoice[K]) {
    setInvoice((current) => ({ ...current, [key]: value }));
    setNotice('');
  }
  function changeParty(key: 'from' | 'to', field: keyof Invoice['from'], value: string) {
    setInvoice((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));
    setNotice('');
  }
  function changeItem(id: string, field: keyof Invoice['items'][number], value: string | boolean) {
    setInvoice((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
    setNotice('');
  }
  function newId() {
    return crypto.randomUUID();
  }
  function reorder(index: number, direction: number) {
    const items = [...invoice.items];
    [items[index], items[index + direction]] = [items[index + direction], items[index]];
    patch('items', items);
  }
  function requestDraftAction(action: DraftAction) {
    if (draftAction) return;
    if (dirty) {
      setDraftAction(action);
      return;
    }
    applyDraftAction(action);
  }
  function applyDraftAction(action: DraftAction) {
    setDraftAction(null);
    if (action.kind === 'leave') {
      const destination = new URL(action.href);
      if (destination.origin === window.location.origin)
        router.push(destination.pathname + destination.search + destination.hash);
      else {
        leavingPage.current = true;
        window.location.assign(destination.href);
      }
      return;
    }
    if (action.kind === 'import') {
      setInvoice(action.document);
      setSaved(null);
      setError('');
      setShowIssues(false);
      loadedId.current = '';
      window.history.replaceState(null, '', window.location.pathname);
      setNotice(tr('Draft imported. Review the details before downloading.'));
      return;
    }
    const sample = action.kind === 'sample';
    const blank = newInvoice(localInvoiceDate());
    setBlankSnapshot(JSON.stringify(blank));
    setInvoice(sample ? sampleInvoice(localInvoiceDate()) : blank);
    setSaved(null);
    setError('');
    setNotice(
      sample
        ? tr('Sample loaded. Replace the example details before sending.')
        : tr('A fresh invoice, ready for your details.'),
    );
    setShowIssues(false);
    loadedId.current = '';
    window.history.replaceState(null, '', window.location.pathname);
  }
  function duplicate() {
    const match = invoice.number.match(/^(.*?)(\d+)$/);
    const number = match
      ? match[1] + String(BigInt(match[2]) + 1n).padStart(match[2].length, '0')
      : `${invoice.number.slice(0, 55)}-copy`;
    setInvoice({
      ...invoice,
      number: number.slice(0, 60),
      issued: localInvoiceDate(),
      due: dueAfter(localInvoiceDate(), 14),
      paid: '0',
    });
    setSaved(null);
    loadedId.current = '';
    window.history.replaceState(null, '', window.location.pathname);
    setNotice(tr('A new copy is ready. Check its invoice number and dates before sending.'));
  }
  async function loadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError(tr('Choose a PNG, JPG, or WebP logo smaller than 5 MB.'));
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      if (image.width * image.height > 25000000)
        throw new Error('Choose a logo smaller than 25 megapixels.');
      const scale = Math.min(1, 512 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/png');
      if (data.length > 480000) throw new Error('This logo is too detailed. Try a smaller image.');
      patch('logo', data);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('The logo could not be opened.'));
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  async function importDraft(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    try {
      if (file.size > 600000) throw new Error('Choose a Folio invoice draft smaller than 600 KB.');
      const parsed = invoiceSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success)
        throw new Error(
          'This is not a supported Folio invoice draft. Check that you selected the original JSON file.',
        );
      requestDraftAction({ kind: 'import', document: parsed.data });
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('The draft could not be opened.'));
    }
  }
  function backup() {
    const parsed = invoiceSchema.safeParse(invoice);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    download(
      new Blob([JSON.stringify(invoice, null, 2)], { type: 'application/json' }),
      invoiceFilename(invoice, 'json'),
    );
    setNotice(tr('Draft backup prepared. Keep the JSON file to edit this invoice later.'));
  }
  async function exportPdf(useFree = false, verified = false) {
    if (busy) return;
    setError('');
    setNotice('');
    setShowIssues(true);
    const document = useFree ? freeInvoice(invoice) : invoice;
    const parsed = invoiceSchema.safeParse(document);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    const problems = invoiceIssues(document, tr);
    if (problems.length) {
      setError(tr('Complete the highlighted checklist before downloading.'));
      return;
    }
    const pro = invoiceProFeatures(document).length > 0;
    if (pro && !access.pro && !verified) {
      setGate(true);
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy('Preparing your PDF…');
    try {
      if (pro) {
        const response = await toolDownloadFetch('/api/invoices/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document }),
          signal: controller.signal,
        });
        const blob = await response.blob();
        if (!controller.signal.aborted) download(blob, invoiceFilename(document));
      } else {
        const [{ createFreeInvoicePdf }, regular, bold] = await Promise.all([
          import('@/lib/invoice-pdf'),
          ...['Regular', 'Bold'].map(async (weight) => {
            const response = await fetch(`/fonts/pdf/LiberationSans-${weight}.ttf`, {
              signal: controller.signal,
            });
            if (!response.ok)
              throw new Error(
                'The invoice fonts could not load. Check your connection and try again.',
              );
            return new Uint8Array(await response.arrayBuffer());
          }),
        ]);
        const result = await createFreeInvoicePdf(document, { regular, bold });
        if (!controller.signal.aborted) download(result.bytes, result.filename);
      }
      if (!controller.signal.aborted)
        setNotice(
          useFree
            ? tr(
                'Free PDF prepared with Classic/free design options. Your working design is unchanged.',
              )
            : tr('Your PDF is ready. Review it before sending it to your customer.'),
        );
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : tr('The PDF could not be prepared.'));
    } finally {
      if (!controller.signal.aborted) setBusy('');
    }
  }
  async function save() {
    if (!access.pro) {
      setUpgrade(true);
      return;
    }
    const parsed = invoiceSchema.safeParse(invoice);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError('');
    setNotice('');
    const controller = new AbortController();
    pending.current = controller;
    setBusy('Saving invoice…');
    try {
      const { invoice: value } = await (
        await accountFetch(saved ? `/api/account/invoices/${saved.id}` : '/api/account/invoices', {
          method: saved ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document: invoice,
            ...(saved ? { revision: saved.revision } : {}),
          }),
          signal: controller.signal,
        })
      ).json();
      if (controller.signal.aborted) return;
      setSaved({ id: value.id, revision: value.revision, snapshot: JSON.stringify(invoice) });
      loadedId.current = `${user?.id}:${value.id}`;
      window.history.replaceState(null, '', `${window.location.pathname}?invoice=${value.id}`);
      setNotice(tr('Invoice saved privately to your account.'));
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : tr('The invoice could not be saved.'));
    } finally {
      if (!controller.signal.aborted) setBusy('');
    }
  }
  const input = <K extends keyof Invoice>(key: K, type = 'text', maxLength?: number) => (
    <input
      type={type}
      value={String(invoice[key])}
      maxLength={maxLength}
      onChange={(e) => patch(key, e.target.value as Invoice[K])}
    />
  );
  const amountInput = (key: 'discount' | 'shipping' | 'paid' | 'taxRate') => (
    <input
      inputMode="decimal"
      maxLength={20}
      value={invoice[key]}
      onChange={(e) => {
        if (/^\d*(?:\.\d{0,4})?$/.test(e.target.value)) patch(key, e.target.value);
      }}
    />
  );
  return (
    <main
      id="main"
      className={s.workspace}
      aria-label={tr('Invoice editor')}
      onClickCapture={confirmExit}
    >
      <header className={s.workspaceBar}>
        <div className={s.workspaceIdentity}>
          <Logo light href={href('/')} />
          <span className={s.headerDivider} aria-hidden="true" />
          <div className={s.workspaceTitle}>
            <h1>{tr('Invoice editor')}</h1>
            <div className={s.documentMeta}>
              <span className={s.documentNumber} title={invoice.number || tr('Untitled invoice')}>
                {invoice.number || tr('Untitled invoice')}
              </span>
              <span
                className={s.draftState}
                data-state={saved && !dirty ? 'saved' : dirty ? 'unsaved' : 'draft'}
              >
                <span className={s.statusDot} />
                {saved
                  ? dirty
                    ? tr('Unsaved changes')
                    : tr('Saved to account')
                  : tr('Draft in this tab')}
              </span>
            </div>
          </div>
        </div>
        <div className={s.workspaceActions}>
          <Link
            href={href('/dashboard?view=invoices')}
            target="_blank"
            rel="noopener"
            aria-label={tr('Saved invoices')}
            className={s.libraryLink}
          >
            <FolderOpen size={17} />
            <span>{tr('Saved invoices')}</span>
          </Link>
          <button
            className={s.saveButton}
            disabled={!ready || loading || !!busy}
            onClick={() => void save()}
            aria-label={tr('Save to account')}
          >
            {busy === 'Saving invoice…' ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Save size={16} />
            )}
            <span className={s.saveFullLabel}>{tr('Save to account')}</span>
            <span className={s.saveShortLabel}>{tr('Save')}</span>
            {!access.pro && <ProBadge />}
          </button>
        </div>
      </header>
      <div className={s.actionBar}>
        <Link
          href={href('/invoice-generator')}
          className={s.backLink}
          aria-label={tr('Back to invoice generator')}
          title={tr('Back to invoice generator')}
        >
          <ArrowLeft size={16} />
          <span>{tr('Invoice generator')}</span>
        </Link>
        <div className={s.secondaryActions}>
          <button disabled={!ready || !!busy} onClick={() => requestDraftAction({ kind: 'new' })}>
            <FilePlus2 size={16} /> {tr('New')}
          </button>
          <button
            disabled={!ready || !!busy}
            onClick={() => requestDraftAction({ kind: 'sample' })}
            aria-label={tr('Try a sample')}
          >
            <ClipboardList size={16} />
            <span className={s.sampleFullLabel}>{tr('Try a sample')}</span>
            <span className={s.sampleShortLabel}>{tr('Sample')}</span>
          </button>
          <span className={s.toolbarDivider} aria-hidden="true" />
          <Menu.Root>
            <Menu.Trigger
              className={s.fileMenuTrigger}
              disabled={!ready || !!busy}
              aria-label={tr('File actions')}
            >
              <FileText size={16} /> {tr('File')} <ChevronDown size={13} />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner
                className="editor-menu-positioner"
                align="end"
                sideOffset={8}
                collisionPadding={12}
              >
                <Menu.Popup className={`editor-menu-popup ${s.fileMenuPopup}`}>
                  <Menu.Item
                    className={`editor-menu-item ${s.fileMenuItem}`}
                    disabled={!ready || !!busy}
                    onClick={duplicate}
                  >
                    <Copy size={16} />
                    <span>
                      {tr('Duplicate invoice')}
                      <small>{tr('Start a new invoice with these details')}</small>
                    </span>
                  </Menu.Item>
                  <Menu.Item
                    className={`editor-menu-item ${s.fileMenuItem}`}
                    disabled={!ready || !!busy}
                    onClick={() => draftInput.current?.click()}
                  >
                    <Upload size={16} />
                    <span>
                      {tr('Import draft')}
                      <small>{tr('Continue from a saved draft backup')}</small>
                    </span>
                  </Menu.Item>
                  <Menu.Item
                    className={`editor-menu-item ${s.fileMenuItem}`}
                    disabled={!ready || !!busy}
                    onClick={backup}
                  >
                    <Download size={16} />
                    <span>
                      {tr('Draft backup')}
                      <small>{tr('Keep an editable copy on your device')}</small>
                    </span>
                  </Menu.Item>
                  <Menu.Separator className={s.fileMenuSeparator} />
                  <Menu.Item
                    className={`editor-menu-item ${s.fileMenuItem}`}
                    render={
                      <Link
                        href={href('/dashboard?view=invoices')}
                        target="_blank"
                        rel="noopener"
                      />
                    }
                  >
                    <FolderOpen size={16} />
                    <span>
                      {tr('Saved invoices')}
                      <small>{tr('Open your private invoice library')}</small>
                    </span>
                  </Menu.Item>
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        </div>
      </div>
      <input
        ref={draftInput}
        type="file"
        accept="application/json,.json"
        hidden
        aria-label={tr('Import invoice draft')}
        onChange={importDraft}
      />
      <input
        ref={logoInput}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        aria-label={tr('Choose business logo')}
        onChange={loadLogo}
      />
      {(error || notice || upgrade || (showIssues && issues.length > 0)) && (
        <div
          className={s.messages}
          tabIndex={0}
          role="region"
          aria-label={tr('Invoice notifications')}
        >
          <button
            className={s.dismissMessage}
            aria-label={tr('Dismiss invoice notifications')}
            onClick={() => {
              setError('');
              setNotice('');
              setUpgrade(false);
              setShowIssues(false);
            }}
          >
            <X size={16} />
          </button>
          {error && (
            <p className={s.error} role="alert">
              {tr(error)}
            </p>
          )}
          {notice && (
            <p className={s.notice} role="status">
              <Check size={16} />
              {tr(notice)}
            </p>
          )}
          {upgrade && (
            <div className={s.upgrade} role="status">
              <div>
                <strong>{tr('Your invoices, ready next time.')}</strong>
                <p>
                  {tr(
                    'Sign in to save up to 200 invoices in your private account for free. PDF downloads and draft backups are also free.',
                  )}
                </p>
              </div>
              <Link
                href={
                  user
                    ? '/pricing'
                    : signInHref(
                        invoiceId ? `/invoice-editor?invoice=${invoiceId}` : '/invoice-editor',
                      )
                }
                target="_blank"
                rel="noopener"
                className="button dark"
              >
                {user ? tr('Explore Pro') : tr('Sign in to continue')} <ChevronRight size={15} />
              </Link>
              <button onClick={() => setUpgrade(false)} aria-label={tr('Dismiss Pro information')}>
                <X size={17} />
              </button>
            </div>
          )}
          {showIssues && issues.length > 0 && (
            <div className={s.checklist}>
              <strong>{tr('Before you download')}</strong>
              <ul>
                {issues.map((issue) => (
                  <li key={issue}>{tr(issue)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <div className={s.mobileSwitch}>
        <button aria-pressed={!mobilePreview} onClick={() => setMobilePreview(false)}>
          {tr('Edit invoice')}
        </button>
        <button aria-pressed={mobilePreview} onClick={() => setMobilePreview(true)}>
          {tr('Live preview')}
        </button>
      </div>
      <div className={s.workGrid}>
        <div className={`${s.editor} ${mobilePreview ? s.mobileHidden : ''}`}>
          <nav className={s.tabs} aria-label={tr('Invoice sections')}>
            {tabs.map((label, index) => (
              <button
                key={label}
                type="button"
                aria-current={tab === index ? 'step' : undefined}
                onClick={() => setTab(index)}
              >
                <span>0{index + 1}</span>
                {tr(label)}
              </button>
            ))}
          </nav>
          <div
            ref={formScroll}
            className={s.formScroll}
            tabIndex={0}
            role="region"
            aria-label={tr('Invoice editing fields')}
          >
            <fieldset className={s.editorFields} disabled={!ready || !!busy}>
              <legend className="sr-only">{tr(tabs[tab])}</legend>
              {tab === 0 && (
                <>
                  <div className={s.sectionTitle}>
                    <div>
                      <span className="eyebrow">{tr('START WITH THE ESSENTIALS')}</span>
                      <h2>{tr('Who’s it for?')}</h2>
                      <p>{tr('A few details make it unmistakably yours.')}</p>
                    </div>
                    <button
                      className={s.logoButton}
                      onClick={() => logoInput.current?.click()}
                      type="button"
                    >
                      {invoice.logo ? (
                        <img src={invoice.logo} width={70} height={42} alt={tr('Current logo')} />
                      ) : (
                        <ImagePlus size={24} />
                      )}
                      <span>{invoice.logo ? tr('Change logo') : tr('Add your logo')}</span>
                    </button>
                  </div>
                  {invoice.logo && (
                    <button
                      className={s.textButton}
                      onClick={() => patch('logo', '')}
                      type="button"
                    >
                      {tr('Remove logo')}
                    </button>
                  )}
                  <div className={s.fieldGrid}>
                    <Field label={tr('Invoice number')}>{input('number', 'text', 60)}</Field>
                    <div className={s.selectField}>
                      <Dropdown
                        label={tr('Currency')}
                        value={invoice.currency}
                        disabled={!ready || !!busy}
                        onValueChange={(value) => patch('currency', value as Invoice['currency'])}
                        options={currencyOptions}
                        searchPlaceholder={tr('Search currencies…')}
                        searchLabel={tr('Search currencies')}
                      />
                      <small>
                        {tr('Changes the currency, not the prices through an exchange rate.')}
                      </small>
                    </div>
                    <DatePicker
                      label={tr('Invoice date')}
                      value={invoice.issued}
                      clearable={false}
                      disabled={!ready || !!busy}
                      onValueChange={(value) => patch('issued', value)}
                    />
                    <DatePicker
                      label={tr('Due date')}
                      value={invoice.due}
                      clearable={false}
                      disabled={!ready || !!busy}
                      onValueChange={(value) => patch('due', value)}
                    />
                  </div>
                  <div className={s.quickTerms}>
                    <span>{tr('Payment due')}</span>
                    {[0, 7, 14, 30, 60].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          if (invoice.issued) patch('due', dueAfter(invoice.issued, days));
                        }}
                      >
                        {days ? tr('Net {value0}', { value0: days }) : tr('On receipt')}
                      </button>
                    ))}
                  </div>
                  <Field label={tr('Reference / purchase order (optional)')}>
                    {input('reference', 'text', 120)}
                  </Field>
                  {(['from', 'to'] as const).map((key) => (
                    <div className={s.partyEditor} key={key}>
                      <h3>
                        <span>{key === 'from' ? '01' : '02'}</span>
                        {key === 'from' ? tr('Your business') : tr('Your customer')}
                      </h3>
                      <div className={s.fieldGrid}>
                        <Field label={key === 'from' ? tr('Business name') : tr('Customer name')}>
                          <input
                            value={invoice[key].name}
                            maxLength={120}
                            onChange={(e) => changeParty(key, 'name', e.target.value)}
                            autoComplete="off"
                          />
                        </Field>
                        <Field
                          label={
                            key === 'from'
                              ? tr('Business email (optional)')
                              : tr('Customer email (optional)')
                          }
                        >
                          <input
                            type="email"
                            value={invoice[key].email}
                            maxLength={160}
                            onChange={(e) => changeParty(key, 'email', e.target.value)}
                          />
                        </Field>
                      </div>
                      <Field
                        label={key === 'from' ? tr('Business address') : tr('Billing address')}
                      >
                        <textarea
                          rows={3}
                          maxLength={500}
                          value={invoice[key].address}
                          onChange={(e) => changeParty(key, 'address', e.target.value)}
                        />
                      </Field>
                      <Field
                        label={
                          key === 'from'
                            ? tr('Business tax ID (optional)')
                            : tr('Customer tax ID (optional)')
                        }
                      >
                        <input
                          maxLength={100}
                          value={invoice[key].taxId}
                          onChange={(e) => changeParty(key, 'taxId', e.target.value)}
                        />
                      </Field>
                    </div>
                  ))}
                  <details className={s.optional}>
                    <summary>{tr('Different shipping address')}</summary>
                    <Field label={tr('Ship to')}>
                      <textarea
                        rows={3}
                        maxLength={500}
                        value={invoice.shipTo}
                        onChange={(e) => patch('shipTo', e.target.value)}
                      />
                    </Field>
                  </details>
                </>
              )}
              {tab === 1 && (
                <>
                  <div className={s.sectionTitle}>
                    <div>
                      <span className="eyebrow">{tr('MAKE EVERY LINE CLEAR')}</span>
                      <h2>{tr('The work, itemized.')}</h2>
                      <p>{tr('Quantities, prices, and totals that stay in sync.')}</p>
                    </div>
                  </div>
                  <div className={s.items}>
                    {invoice.items.map((item, index) => (
                      <div className={s.item} key={item.id}>
                        <div className={s.itemHeading}>
                          <strong>
                            {tr('Item')} {String(index + 1).padStart(2, '0')}
                          </strong>
                          <div>
                            <button
                              type="button"
                              onClick={() => reorder(index, -1)}
                              disabled={!index || !!busy}
                              aria-label={tr('Move item {value0} up', { value0: index + 1 })}
                            >
                              <ArrowUp size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => reorder(index, 1)}
                              disabled={index === invoice.items.length - 1 || !!busy}
                              aria-label={tr('Move item {value0} down', { value0: index + 1 })}
                            >
                              <ArrowDown size={15} />
                            </button>
                            <button
                              type="button"
                              disabled={invoice.items.length >= 50 || !!busy}
                              onClick={() =>
                                patch('items', [
                                  ...invoice.items.slice(0, index + 1),
                                  { ...item, id: newId() },
                                  ...invoice.items.slice(index + 1),
                                ])
                              }
                              aria-label={tr('Duplicate item {value0}', { value0: index + 1 })}
                            >
                              <Copy size={15} />
                            </button>
                            <button
                              type="button"
                              disabled={invoice.items.length === 1 || !!busy}
                              onClick={() =>
                                patch(
                                  'items',
                                  invoice.items.filter((i) => i.id !== item.id),
                                )
                              }
                              aria-label={tr('Remove item {value0}', { value0: index + 1 })}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                        <Field label={tr('Description {value0}', { value0: index + 1 })}>
                          <textarea
                            rows={2}
                            maxLength={500}
                            placeholder={tr('e.g. Website design · 12 hours')}
                            value={item.description}
                            onChange={(e) => changeItem(item.id, 'description', e.target.value)}
                          />
                        </Field>
                        <div className={s.itemAmounts}>
                          <Field label={tr('Quantity {value0}', { value0: index + 1 })}>
                            <input
                              inputMode="decimal"
                              maxLength={12}
                              value={item.quantity}
                              onChange={(e) => {
                                if (/^\d*(?:\.\d{0,4})?$/.test(e.target.value))
                                  changeItem(item.id, 'quantity', e.target.value);
                              }}
                            />
                          </Field>
                          <Field
                            label={tr('Rate {value0} ({value1})', {
                              value0: index + 1,
                              value1: invoice.currency,
                            })}
                          >
                            <input
                              inputMode="decimal"
                              maxLength={14}
                              value={item.rate}
                              onChange={(e) => {
                                if (/^\d*(?:\.\d{0,4})?$/.test(e.target.value))
                                  changeItem(item.id, 'rate', e.target.value);
                              }}
                            />
                          </Field>
                          <div className={s.lineAmount}>
                            <span>{tr('Amount')}</span>
                            <strong>{invoiceMoney(totals.amounts[index], invoice.currency)}</strong>
                          </div>
                        </div>
                        <label className={s.check}>
                          <input
                            type="checkbox"
                            checked={item.taxable}
                            onChange={(e) => changeItem(item.id, 'taxable', e.target.checked)}
                          />
                          {tr('Apply invoice tax to this item')}
                        </label>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={s.addItem}
                    disabled={invoice.items.length >= 50 || !!busy}
                    onClick={() =>
                      patch('items', [
                        ...invoice.items,
                        { id: newId(), description: '', quantity: '1', rate: '', taxable: true },
                      ])
                    }
                  >
                    <Plus size={17} /> {tr('Add line item')}{' '}
                    <small>{invoice.items.length} / 50</small>
                  </button>
                  <div className={s.adjustments}>
                    <h3>{tr('Adjustments')}</h3>
                    <div className={s.fieldGrid}>
                      <div className={s.selectField}>
                        <Dropdown
                          label={tr('Discount type')}
                          value={invoice.discountMode}
                          disabled={!ready || !!busy}
                          onValueChange={(value) =>
                            patch('discountMode', value as Invoice['discountMode'])
                          }
                          options={[
                            { value: 'percent', label: tr('Percentage (%)') },
                            {
                              value: 'fixed',
                              label: tr('Fixed amount ({value0})', { value0: invoice.currency }),
                            },
                          ]}
                        />
                      </div>
                      <Field label={tr('Discount')}>{amountInput('discount')}</Field>
                      <div className={s.selectField}>
                        <Dropdown
                          label={tr('Tax calculation')}
                          value={invoice.taxMode}
                          disabled={!ready || !!busy}
                          onValueChange={(value) => patch('taxMode', value as Invoice['taxMode'])}
                          options={[
                            { value: 'none', label: tr('No tax') },
                            { value: 'exclusive', label: tr('Add tax to prices') },
                            { value: 'inclusive', label: tr('Prices include tax') },
                          ]}
                        />
                      </div>
                      <Field label={tr('Tax rate (%)')}>{amountInput('taxRate')}</Field>
                      <Field label={tr('Tax label')}>{input('taxLabel', 'text', 30)}</Field>
                      <Field label={tr('Shipping ({value0})', { value0: invoice.currency })}>
                        {amountInput('shipping')}
                      </Field>
                    </div>
                    <label className={s.check}>
                      <input
                        type="checkbox"
                        checked={invoice.shippingTaxable}
                        onChange={(e) => patch('shippingTaxable', e.target.checked)}
                      />
                      {tr('Apply invoice tax to shipping')}
                    </label>
                    <p className={s.help}>
                      {tr(
                        'Discounts apply to items before tax. Shipping is added separately. Tax is rounded for each taxable item.',
                      )}
                    </p>
                  </div>
                </>
              )}
              {tab === 2 && (
                <>
                  <div className={s.sectionTitle}>
                    <div>
                      <span className="eyebrow">{tr('MAKE THE NEXT STEP EASY')}</span>
                      <h2>{tr('Ready to get paid.')}</h2>
                      <p>{tr('Give your customer a clear way forward.')}</p>
                    </div>
                  </div>
                  <Field
                    label={tr('Amount already paid ({value0})', { value0: invoice.currency })}
                    hint="Enter a deposit or payment you have already received. This does not collect a payment."
                  >
                    {amountInput('paid')}
                  </Field>
                  <Field label={tr('Payment instructions')}>
                    <textarea
                      rows={4}
                      maxLength={1500}
                      placeholder={tr(
                        'Bank name, account details, or your preferred payment method',
                      )}
                      value={invoice.paymentDetails}
                      onChange={(e) => patch('paymentDetails', e.target.value)}
                    />
                  </Field>
                  <Field
                    label={tr('Payment link (optional)')}
                    hint="Paste an existing HTTPS checkout link. Folio does not process or track payments."
                  >
                    {input('paymentUrl', 'url', 500)}
                  </Field>
                  <label className={s.proToggle}>
                    <span>
                      <input
                        type="checkbox"
                        checked={invoice.paymentQr}
                        onChange={(e) => patch('paymentQr', e.target.checked)}
                      />
                      {tr('Add a scannable payment QR code')}
                    </span>
                    <ProBadge />
                  </label>
                  <Field label={tr('Notes')}>
                    <textarea
                      rows={3}
                      maxLength={2000}
                      placeholder={tr('A personal thank-you or useful project details')}
                      value={invoice.notes}
                      onChange={(e) => patch('notes', e.target.value)}
                    />
                  </Field>
                  <Field label={tr('Terms')}>
                    <textarea
                      rows={4}
                      maxLength={2000}
                      placeholder={tr(
                        'Payment timing, agreed milestones, or other terms already agreed with your customer',
                      )}
                      value={invoice.terms}
                      onChange={(e) => patch('terms', e.target.value)}
                    />
                  </Field>
                </>
              )}
              {tab === 3 && (
                <>
                  <div className={s.sectionTitle}>
                    <div>
                      <span className="eyebrow">{tr('THE FINISHING TOUCH')}</span>
                      <h2>{tr('Good work. Well presented.')}</h2>
                      <p>
                        {FREE_LAUNCH ? (
                          tr('All invoice designs are free. Choose any style.')
                        ) : (
                          <>
                            {tr('2 free designs and')} {proInvoiceDesignCount}{' '}
                            {tr('Pro designs. Preview any style before downloading.')}
                          </>
                        )}
                      </p>
                    </div>
                    <LayoutTemplate size={28} />
                  </div>
                  <div className={s.templates}>
                    {invoiceTemplates.map((template) => (
                      <button
                        type="button"
                        aria-pressed={invoice.template === template.id}
                        className={s.template}
                        key={template.id}
                        onClick={() => patch('template', template.id)}
                      >
                        <div className={s.miniPaper}>
                          <InvoiceDesignThumbnail design={template} accent={invoice.accent} />
                        </div>
                        <span className={s.templateName}>
                          {tr(template.name)}
                          {!FREE_LAUNCH && template.pro ? (
                            <ProBadge />
                          ) : (
                            <small>{tr('FREE')}</small>
                          )}
                        </span>
                        <small>{tr(template.description)}</small>
                        {invoice.template === template.id && (
                          <Check className={s.templateCheck} size={17} />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className={s.colorRow}>
                    <strong>{tr('Accent color')}</strong>
                    <div>
                      {invoiceColors.map((color) => (
                        <button
                          type="button"
                          key={color}
                          style={{ backgroundColor: color }}
                          aria-label={tr('Use {value0} accent', { value0: color })}
                          aria-pressed={invoice.accent === color}
                          onClick={() => patch('accent', color)}
                        >
                          {invoice.accent === color && <Check size={15} />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field
                    label={tr(FREE_LAUNCH ? 'Custom brand color' : 'Custom brand color · Pro')}
                  >
                    <div className={s.customColor}>
                      <input
                        aria-label={tr('Custom brand color')}
                        type="color"
                        value={invoice.accent}
                        onChange={(e) => patch('accent', e.target.value)}
                      />
                      <code>{invoice.accent.toUpperCase()}</code>
                      <ProBadge />
                    </div>
                  </Field>
                  <div className={s.selectField}>
                    <Dropdown
                      label={tr('Paper size')}
                      value={invoice.paper}
                      disabled={!ready || !!busy}
                      onValueChange={(value) => patch('paper', value as Invoice['paper'])}
                      options={[
                        { value: 'a4', label: tr('A4 · 210 × 297 mm') },
                        { value: 'letter', label: tr('US Letter · 8.5 × 11 in') },
                      ]}
                    />
                  </div>
                  <Field
                    label={tr(FREE_LAUNCH ? 'Custom footer' : 'Custom footer · Pro')}
                    hint="A short business tagline or registration detail, repeated on every PDF page."
                  >
                    <input
                      maxLength={160}
                      value={invoice.footer}
                      onChange={(e) => patch('footer', e.target.value)}
                    />
                  </Field>
                  {!FREE_LAUNCH && !!proFeatures.length && (
                    <div className={s.designNotice}>
                      <Palette size={18} />
                      <p>
                        {tr('This design uses')}{' '}
                        {proFeatures.map((feature) => tr(feature)).join(', ')}.{' '}
                        {access.pro
                          ? tr(FREE_LAUNCH ? 'Included for free.' : 'Included in your Pro plan.')
                          : tr(
                              'Preview freely. Pro is required for this PDF; a free version is also available below.',
                            )}
                      </p>
                    </div>
                  )}
                </>
              )}
              <div className={s.sectionNav}>
                {tab > 0 && (
                  <button type="button" onClick={() => setTab(tab - 1)}>
                    {tr('Back')}
                  </button>
                )}
                {tab < tabs.length - 1 && (
                  <button type="button" className={s.nextSection} onClick={() => setTab(tab + 1)}>
                    {tr('Next:')} {tr(tabs[tab + 1])} <ChevronRight size={15} />
                  </button>
                )}
              </div>
            </fieldset>
            <div className={s.privacy}>
              <ShieldCheck size={18} />
              <p>
                {tr(
                  'Free PDFs are created on your device. Pro PDFs are processed on Folio. Invoices are saved online only when you choose',
                )}{' '}
                <strong>{tr('Save to account')}</strong>
                {tr('. Download a draft backup before closing an unsaved invoice.')}
              </p>
            </div>
          </div>
        </div>
        <aside className={`${s.previewColumn} ${!mobilePreview ? s.mobileHidden : ''}`}>
          <div className={s.previewSticky}>
            <div className={s.previewHeading}>
              <span>
                <span className={s.liveDot} /> {tr('LIVE PREVIEW')}
              </span>
              <span>
                {invoice.paper === 'a4' ? tr('A4') : tr('US Letter')} · {invoice.currency}
              </span>
            </div>
            <div
              className={s.previewScroll}
              tabIndex={0}
              role="region"
              aria-label={tr('Scrollable invoice preview')}
            >
              <InvoicePreview invoice={invoice} />
            </div>
            <p className={s.previewHint}>
              {tr('Your PDF automatically continues onto extra pages when needed.')}
            </p>
          </div>
        </aside>
      </div>
      <div className={s.exportBar}>
        <div>
          <span>{totals.credit ? tr('OVERPAYMENT CREDIT') : tr('BALANCE DUE')}</span>
          <strong>{invoiceMoney(totals.credit || totals.balance, invoice.currency)}</strong>
          <small>
            {invoice.items.length} {tr('line')}{' '}
            {invoice.items.length === 1 ? tr('item') : tr('items')} ·{' '}
            {!FREE_LAUNCH && proFeatures.length ? tr('Pro design') : tr('Free PDF · no watermark')}
          </small>
        </div>
        <div className={s.exportActions}>
          {!!proFeatures.length && !access.pro && (
            <button
              className="button secondary"
              disabled={!ready || !!busy}
              onClick={() => void exportPdf(true)}
            >
              {tr('Download free version')}
            </button>
          )}
          <button
            className="button primary"
            disabled={!ready || !!busy}
            onClick={() => void exportPdf()}
          >
            {busy ? <Loader2 size={17} className="spin" /> : <Download size={17} />}
            {busy
              ? tr(busy)
              : tr(proFeatures.length && !access.pro ? 'Download with Pro' : 'Download PDF')}
          </button>
        </div>
      </div>
      {draftAction && (
        <ConfirmDialog
          {...draftConfirmations[draftAction.kind]}
          onCancel={() => setDraftAction(null)}
          onConfirm={() => applyDraftAction(draftAction)}
        >
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setDraftAction(null);
              backup();
            }}
          >
            <Download size={16} aria-hidden="true" /> {tr('Download draft backup')}
          </button>
        </ConfirmDialog>
      )}
      <DownloadGate
        open={gate}
        onClose={() => setGate(false)}
        onReady={() => void exportPdf(false, true)}
        tool="invoice-generator"
        saved={!!saved && !dirty}
      />
    </main>
  );
}

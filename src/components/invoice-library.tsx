'use client';
import { useUiTranslation, useUiLocale } from './ui-language';
import { localizedHref } from '@/lib/i18n/translate';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, FilePlus2, RefreshCw, Trash2 } from 'lucide-react';
import { useAccount } from './account-provider';
import { accountFetch } from '@/lib/auth-client';
import { invoiceMoney, type InvoiceCurrency } from '@/lib/invoice';
import s from './invoice-generator.module.css';
type Entry = {
  id: string;
  updated_at: string;
  summary: {
    number: string;
    customer: string;
    currency: InvoiceCurrency;
    total: number;
    balance: number;
    issued: string;
    due: string;
  };
};
export function InvoiceLibrary() {
  const tr = useUiTranslation();
  const locale = useUiLocale();
  const href = (path: string) => localizedHref(locale, path);

  const { user, access } = useAccount();
  const [invoices, setInvoices] = useState<Entry[]>([]),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [remove, setRemove] = useState(''),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!user) {
        setInvoices([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const data = await (
          await accountFetch(`/api/account/invoices?page=${page}`, { signal })
        ).json();
        if (signal.aborted) return;
        setInvoices(data.invoices);
        setTotal(data.total);
        if (page > Math.max(1, Math.ceil(data.total / 10)))
          setPage(Math.max(1, Math.ceil(data.total / 10)));
      } catch (e) {
        if (!signal.aborted)
          setError(e instanceof Error ? e.message : 'Your invoices could not be loaded.');
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [user, page],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load, revision]);
  async function deleteInvoice(id: string) {
    setBusy(true);
    setError('');
    try {
      await accountFetch(`/api/account/invoices/${id}`, { method: 'DELETE' });
      setRemove('');
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The invoice could not be deleted.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={s.library} aria-label={tr('Saved invoices')}>
      <div className={s.libraryHeader}>
        <div>
          <h2>{tr('Your invoice library.')}</h2>
          <p>{tr('Pick up where you left off. Keep the details in one place.')}</p>
        </div>
        <Link href={href('/invoice-editor')} className="button dark">
          <FilePlus2 size={16} /> {tr('New invoice')}
        </Link>
      </div>
      <p>
        {!user
          ? tr(
              'Create and download invoices for free. Sign in with Pro to save drafts across devices.',
            )
          : access.pro
            ? tr('{value0} of 200 saved invoices. Saving is always your choice.', { value0: total })
            : tr(
                'Pro is required to save or update invoices. You can still open, back up, or delete previously saved invoices, and download them with free design options.',
              )}
      </p>
      {error && (
        <p className={s.error} role="alert">
          {tr(error)}{' '}
          <button className="text-link" onClick={() => setRevision((v) => v + 1)}>
            <RefreshCw size={14} /> {tr('Retry')}
          </button>
        </p>
      )}
      {loading && user ? (
        <p role="status">{tr('Loading invoices…')}</p>
      ) : !invoices.length && !error ? (
        <p className={s.help}>
          {tr(
            'Your saved invoices will appear here. Start with a blank invoice or try the sample in the generator.',
          )}
        </p>
      ) : null}
      <div className={s.libraryList}>
        {!loading &&
          invoices.map((invoice) => (
            <article className={s.libraryRow} key={invoice.id}>
              <div>
                <strong>{invoice.summary.number || tr('Untitled invoice')}</strong>
                <span>{invoice.summary.customer || tr('Customer not added')}</span>
                <small>
                  {tr('Due')} {invoice.summary.due} {tr('· Updated')}{' '}
                  {new Date(invoice.updated_at).toLocaleDateString(locale)}
                </small>
              </div>
              <div>
                <strong>{invoiceMoney(invoice.summary.total, invoice.summary.currency)}</strong>
                <small>
                  {invoice.summary.balance
                    ? tr('{value0} due', {
                        value0: invoiceMoney(invoice.summary.balance, invoice.summary.currency),
                      })
                    : tr('No balance due')}
                </small>
              </div>
              <div className={s.libraryActions}>
                {remove === invoice.id ? (
                  <>
                    <span>{tr('Delete this draft?')}</span>
                    <button disabled={busy} onClick={() => void deleteInvoice(invoice.id)}>
                      {tr('Delete')}
                    </button>
                    <button disabled={busy} onClick={() => setRemove('')}>
                      {tr('Cancel')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link href={`/invoice-editor?invoice=${invoice.id}`}>
                      {tr('Open')} <ArrowUpRight size={14} />
                    </Link>
                    <button
                      onClick={() => setRemove(invoice.id)}
                      aria-label={tr('Delete {value0}', {
                        value0: invoice.summary.number || 'invoice',
                      })}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
      </div>
      {total > 10 && (
        <nav className={s.pagination} aria-label={tr('Invoice library pages')}>
          <button disabled={page <= 1 || loading} onClick={() => setPage((v) => v - 1)}>
            {tr('Previous')}
          </button>
          <span>
            {tr('Page')} {page} {tr('of')} {Math.ceil(total / 10)}
          </span>
          <button disabled={page * 10 >= total || loading} onClick={() => setPage((v) => v + 1)}>
            {tr('Next')}
          </button>
        </nav>
      )}
    </section>
  );
}

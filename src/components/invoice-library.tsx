'use client';
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
    <section className={s.library} aria-label="Saved invoices">
      <div className={s.libraryHeader}>
        <div>
          <h2>Your invoice library.</h2>
          <p>Pick up where you left off. Keep the details in one place.</p>
        </div>
        <Link href="/invoice-editor" className="button dark">
          <FilePlus2 size={16} /> New invoice
        </Link>
      </div>
      <p>
        {!user
          ? 'Create and download invoices for free. Sign in with Pro to save drafts across devices.'
          : access.pro
            ? `${total} of 200 saved invoices. Saving is always your choice.`
            : 'Pro is required to save or update invoices. You can still open, back up, or delete previously saved invoices, and download them with free design options.'}
      </p>
      {error && (
        <p className={s.error} role="alert">
          {error}{' '}
          <button className="text-link" onClick={() => setRevision((v) => v + 1)}>
            <RefreshCw size={14} /> Retry
          </button>
        </p>
      )}
      {loading && user ? (
        <p role="status">Loading invoices…</p>
      ) : !invoices.length && !error ? (
        <p className={s.help}>
          Your saved invoices will appear here. Start with a blank invoice or try the sample in the
          generator.
        </p>
      ) : null}
      <div className={s.libraryList}>
        {!loading &&
          invoices.map((invoice) => (
            <article className={s.libraryRow} key={invoice.id}>
              <div>
                <strong>{invoice.summary.number || 'Untitled invoice'}</strong>
                <span>{invoice.summary.customer || 'Customer not added'}</span>
                <small>
                  Due {invoice.summary.due} · Updated{' '}
                  {new Date(invoice.updated_at).toLocaleDateString()}
                </small>
              </div>
              <div>
                <strong>{invoiceMoney(invoice.summary.total, invoice.summary.currency)}</strong>
                <small>
                  {invoice.summary.balance
                    ? `${invoiceMoney(invoice.summary.balance, invoice.summary.currency)} due`
                    : 'No balance due'}
                </small>
              </div>
              <div className={s.libraryActions}>
                {remove === invoice.id ? (
                  <>
                    <span>Delete this draft?</span>
                    <button disabled={busy} onClick={() => void deleteInvoice(invoice.id)}>
                      Delete
                    </button>
                    <button disabled={busy} onClick={() => setRemove('')}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <Link href={`/invoice-editor?invoice=${invoice.id}`}>
                      Open <ArrowUpRight size={14} />
                    </Link>
                    <button
                      onClick={() => setRemove(invoice.id)}
                      aria-label={`Delete ${invoice.summary.number || 'invoice'}`}
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
        <nav className={s.pagination} aria-label="Invoice library pages">
          <button disabled={page <= 1 || loading} onClick={() => setPage((v) => v - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {Math.ceil(total / 10)}
          </span>
          <button disabled={page * 10 >= total || loading} onClick={() => setPage((v) => v + 1)}>
            Next
          </button>
        </nav>
      )}
    </section>
  );
}

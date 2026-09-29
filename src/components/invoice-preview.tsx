'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { invoiceMoney, invoiceTotals, type Invoice } from '@/lib/invoice';
import { invoiceDesign, invoiceDesignColors, invoiceInitials } from '@/lib/invoice-designs';
import s from './invoice-generator.module.css';

export function InvoicePreview({ invoice }: { invoice: Invoice }) {
  const design = invoiceDesign(invoice.template),
    colors = invoiceDesignColors(invoice.accent);
  const totals = invoiceTotals(invoice),
    money = (value: number) => invoiceMoney(value, invoice.currency);
  const [qr, setQr] = useState('');
  useEffect(() => {
    let active = true;
    setQr('');
    if (invoice.paymentQr && /^https:\/\//.test(invoice.paymentUrl)) {
      void import('qrcode')
        .then((module) =>
          module.toDataURL(invoice.paymentUrl, {
            width: 160,
            margin: 4,
            errorCorrectionLevel: 'M',
          }),
        )
        .then((value) => {
          if (active) setQr(value);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [invoice.paymentQr, invoice.paymentUrl]);
  return (
    <article
      className={s.paper}
      data-template={design.id}
      data-header={design.header}
      data-frame={design.frame}
      data-table={design.table}
      data-balance={design.balance}
      data-serif={design.serif || undefined}
      style={
        {
          '--invoice-accent': colors.accent,
          '--invoice-text': colors.text,
          '--invoice-on-accent': colors.onAccent,
          '--invoice-tint': colors.tint,
        } as CSSProperties
      }
      aria-label="Invoice live preview"
    >
      <header className={s.paperHeader}>
        {design.header === 'monogram' && (
          <span className={s.monogram}>{invoiceInitials(invoice.from.name)}</span>
        )}
        <div className={s.paperTitle}>
          <span className={s.paperEyebrow}>A RECORD OF GOOD WORK</span>
          <h2>INVOICE</h2>
        </div>
        {invoice.logo && (
          <img
            src={invoice.logo}
            width={100}
            height={56}
            className={s.previewLogo}
            alt="Your business logo"
          />
        )}
      </header>
      <div className={s.paperMeta}>
        <strong>{invoice.number || 'Invoice number'}</strong>
        <span>
          Issued {invoice.issued || '—'}
          <br />
          Due {invoice.due || '—'}
        </span>
      </div>
      {invoice.reference && <p className={s.paperReference}>Reference: {invoice.reference}</p>}
      <div className={s.paperParties}>
        {(['from', 'to'] as const).map((key) => (
          <div key={key}>
            <span className={s.paperLabel}>{key === 'from' ? 'FROM' : 'BILL TO'}</span>
            <strong>
              {invoice[key].name ||
                (key === 'from' ? 'Your business name' : 'Your customer’s name')}
            </strong>
            <p>{invoice[key].address || 'Street address\nCity, postal code'}</p>
            {invoice[key].email && <p>{invoice[key].email}</p>}
            {invoice[key].taxId && <p>Tax ID: {invoice[key].taxId}</p>}
          </div>
        ))}
      </div>
      {invoice.shipTo && (
        <div className={s.paperSection}>
          <span className={s.paperLabel}>SHIP TO</span>
          <p>{invoice.shipTo}</p>
        </div>
      )}
      <table className={s.paperTable}>
        <caption className="sr-only">Invoice items</caption>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={item.id}>
              <td>
                {item.description || 'Your product or service'}
                {invoice.taxMode !== 'none' && !item.taxable && <small>Tax exempt</small>}
              </td>
              <td>{item.quantity || '0'}</td>
              <td>
                {Number(item.rate || 0).toLocaleString('en-US', { maximumFractionDigits: 4 })}
              </td>
              <td>{money(totals.amounts[index])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className={s.paperTotals}>
        <div>
          <dt>Subtotal</dt>
          <dd>{money(totals.subtotal)}</dd>
        </div>
        {!!totals.discount && (
          <div>
            <dt>Discount</dt>
            <dd>−{money(totals.discount)}</dd>
          </div>
        )}
        {!!totals.shipping && (
          <div>
            <dt>Shipping</dt>
            <dd>{money(totals.shipping)}</dd>
          </div>
        )}
        {invoice.taxMode !== 'none' && (
          <div>
            <dt>
              {invoice.taxLabel || 'Tax'} ({invoice.taxRate || '0'}%)
              {invoice.taxMode === 'inclusive' && <small>Included in prices</small>}
            </dt>
            <dd>{money(totals.tax)}</dd>
          </div>
        )}
        <div>
          <dt>Total</dt>
          <dd>{money(totals.total)}</dd>
        </div>
        {!!totals.paid && (
          <div>
            <dt>Amount paid</dt>
            <dd>{money(totals.paid)}</dd>
          </div>
        )}
        <div className={s.balance}>
          <dt>{totals.credit ? 'Overpayment credit' : 'Balance due'}</dt>
          <dd>{money(totals.credit || totals.balance)}</dd>
        </div>
      </dl>
      {[
        ['PAYMENT DETAILS', invoice.paymentDetails],
        ['PAYMENT LINK', invoice.paymentUrl],
        ['NOTES', invoice.notes],
        ['TERMS', invoice.terms],
      ].map(([label, value]) =>
        value ? (
          <div className={s.paperSection} key={label}>
            <span className={s.paperLabel}>{label}</span>
            <p>{value}</p>
          </div>
        ) : null,
      )}
      {qr && (
        <div className={s.paperQr}>
          <img src={qr} width={84} height={84} alt="QR code for your payment link" />
          <span>
            Scan to open the payment link.<small>Confirm the recipient before paying.</small>
          </span>
        </div>
      )}
      {invoice.footer && <footer className={s.paperFooter}>{invoice.footer}</footer>}
    </article>
  );
}

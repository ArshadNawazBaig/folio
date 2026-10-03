'use client';
import { useUiTranslation } from '@/components/ui-language';

import { useEffect, useState, type CSSProperties } from 'react';
import { invoiceMoney, invoiceTotals, type Invoice } from '@/lib/invoice';
import { invoiceDesign, invoiceDesignColors, invoiceInitials } from '@/lib/invoice-designs';
import s from './invoice-generator.module.css';

export function InvoicePreview({ invoice }: { invoice: Invoice }) {
  const tr = useUiTranslation();

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
      aria-label={tr('Invoice live preview')}
    >
      <header className={s.paperHeader}>
        {design.header === 'monogram' && (
          <span className={s.monogram}>{invoiceInitials(invoice.from.name)}</span>
        )}
        <div className={s.paperTitle}>
          <span className={s.paperEyebrow}>{tr('A RECORD OF GOOD WORK')}</span>
          <h2>{tr('INVOICE')}</h2>
        </div>
        {invoice.logo && (
          <img
            src={invoice.logo}
            width={100}
            height={56}
            className={s.previewLogo}
            alt={tr('Your business logo')}
          />
        )}
      </header>
      <div className={s.paperMeta}>
        <strong>{invoice.number || tr('Invoice number')}</strong>
        <span>
          {tr('Issued')} {invoice.issued || '—'}
          <br />
          {tr('Due')} {invoice.due || '—'}
        </span>
      </div>
      {invoice.reference && (
        <p className={s.paperReference}>
          {tr('Reference:')} {invoice.reference}
        </p>
      )}
      <div className={s.paperParties}>
        {(['from', 'to'] as const).map((key) => (
          <div key={key}>
            <span className={s.paperLabel}>{key === 'from' ? tr('FROM') : tr('BILL TO')}</span>
            <strong>
              {invoice[key].name ||
                (key === 'from' ? tr('Your business name') : tr('Your customer’s name'))}
            </strong>
            <p>{invoice[key].address || tr('Street address\nCity, postal code')}</p>
            {invoice[key].email && <p>{invoice[key].email}</p>}
            {invoice[key].taxId && (
              <p>
                {tr('Tax ID:')} {invoice[key].taxId}
              </p>
            )}
          </div>
        ))}
      </div>
      {invoice.shipTo && (
        <div className={s.paperSection}>
          <span className={s.paperLabel}>{tr('SHIP TO')}</span>
          <p>{invoice.shipTo}</p>
        </div>
      )}
      <table className={s.paperTable}>
        <caption className="sr-only">{tr('Invoice items')}</caption>
        <thead>
          <tr>
            <th>{tr('Description')}</th>
            <th>{tr('Qty')}</th>
            <th>{tr('Rate')}</th>
            <th>{tr('Amount')}</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={item.id}>
              <td>
                {item.description || tr('Your product or service')}
                {invoice.taxMode !== 'none' && !item.taxable && <small>{tr('Tax exempt')}</small>}
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
          <dt>{tr('Subtotal')}</dt>
          <dd>{money(totals.subtotal)}</dd>
        </div>
        {!!totals.discount && (
          <div>
            <dt>{tr('Discount')}</dt>
            <dd>−{money(totals.discount)}</dd>
          </div>
        )}
        {!!totals.shipping && (
          <div>
            <dt>{tr('Shipping')}</dt>
            <dd>{money(totals.shipping)}</dd>
          </div>
        )}
        {invoice.taxMode !== 'none' && (
          <div>
            <dt>
              {invoice.taxLabel || tr('Tax')} ({invoice.taxRate || '0'}%)
              {invoice.taxMode === 'inclusive' && <small>{tr('Included in prices')}</small>}
            </dt>
            <dd>{money(totals.tax)}</dd>
          </div>
        )}
        <div>
          <dt>{tr('Total')}</dt>
          <dd>{money(totals.total)}</dd>
        </div>
        {!!totals.paid && (
          <div>
            <dt>{tr('Amount paid')}</dt>
            <dd>{money(totals.paid)}</dd>
          </div>
        )}
        <div className={s.balance}>
          <dt>{totals.credit ? tr('Overpayment credit') : tr('Balance due')}</dt>
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
            <span className={s.paperLabel}>{tr(label)}</span>
            <p>{value}</p>
          </div>
        ) : null,
      )}
      {qr && (
        <div className={s.paperQr}>
          <img src={qr} width={84} height={84} alt={tr('QR code for your payment link')} />
          <span>
            {tr('Scan to open the payment link.')}
            <small>{tr('Confirm the recipient before paying.')}</small>
          </span>
        </div>
      )}
      {invoice.footer && <footer className={s.paperFooter}>{invoice.footer}</footer>}
    </article>
  );
}

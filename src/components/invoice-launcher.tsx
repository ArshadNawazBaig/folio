'use client';
import { FREE_LAUNCH } from '@/lib/access-policy';

import { useUiTranslation, useLocalizedHref } from '@/components/ui-language';
import Link from 'next/link';
import { ArrowUpRight, Check, LayoutTemplate } from 'lucide-react';
import s from './invoice-launcher.module.css';

export function InvoiceLauncher() {
  const tr = useUiTranslation();
  const href = useLocalizedHref();

  return (
    <section className={s.launcher} aria-labelledby="invoice-launch-title">
      <div className={s.copy}>
        <span className="eyebrow">{tr('YOUR INVOICE WORKSPACE')}</span>
        <h2 id="invoice-launch-title">
          {tr('Good work.')}
          <br />
          {tr('Beautifully billed.')}
        </h2>
        <p>
          {tr(
            'Give your invoice a space of its own. Add your details, adjust the design, and see every change in a live preview. Your PDF is a click away.',
          )}
        </p>
        <ul>
          <li>
            <Check size={16} /> {tr('Your logo, line items, tax, and discounts')}
          </li>
          <li>
            <Check size={16} /> {tr('Free PDF downloads without a watermark')}
          </li>
          <li>
            <Check size={16} />{' '}
            {tr(
              FREE_LAUNCH
                ? 'All designs and account saving included for free'
                : '10 premium designs and account saving with Pro',
            )}
          </li>
        </ul>
        <Link href={href('/invoice-editor')} className="button primary">
          {tr('Open invoice editor')} <ArrowUpRight size={18} />
        </Link>
        <small>{tr('No account needed to start. Save a draft backup before closing.')}</small>
        <Link href={href('/dashboard?view=invoices')} className={s.saved}>
          {tr('Open saved invoices')} <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className={s.visual} aria-hidden="true">
        <div className={s.caption}>
          <LayoutTemplate size={15} /> {tr('A LITTLE PREVIEW OF WHAT’S POSSIBLE')}
        </div>
        <div className={s.paper}>
          <div className={s.paperHeading}>
            <strong>{tr('INVOICE')}</strong>
            <span>
              {tr('NORTH')}
              <br />
              {tr('& FORM.')}
            </span>
          </div>
          <div className={s.parties}>
            <span>
              {tr('FROM')}
              <b>{tr('Your business')}</b>
            </span>
            <span>
              {tr('BILL TO')}
              <b>{tr('Your customer')}</b>
            </span>
          </div>
          <div className={s.row}>
            <span>{tr('Project design')}</span>
            <b>600.00</b>
          </div>
          <div className={s.row}>
            <span>{tr('Final deliverables')}</span>
            <b>200.00</b>
          </div>
          <div className={s.total}>
            <span>{tr('Balance due')}</span>
            <strong>{tr('USD 800.00')}</strong>
          </div>
          <p>{tr('Thank you for the opportunity to work together.')}</p>
        </div>
        <span className={s.badge}>
          <Check size={14} /> {tr('Made by you. Ready to send.')}
        </span>
      </div>
    </section>
  );
}

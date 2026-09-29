import Link from 'next/link';
import { ArrowUpRight, Check, LayoutTemplate } from 'lucide-react';
import s from './invoice-launcher.module.css';

export function InvoiceLauncher() {
  return (
    <section className={s.launcher} aria-labelledby="invoice-launch-title">
      <div className={s.copy}>
        <span className="eyebrow">YOUR INVOICE WORKSPACE</span>
        <h2 id="invoice-launch-title">
          Good work.
          <br />
          Beautifully billed.
        </h2>
        <p>
          Give your invoice a space of its own. Add your details, adjust the design, and see every
          change in a live preview. Your PDF is a click away.
        </p>
        <ul>
          <li>
            <Check size={16} /> Your logo, line items, tax, and discounts
          </li>
          <li>
            <Check size={16} /> Free PDF downloads without a watermark
          </li>
          <li>
            <Check size={16} /> 10 premium designs and account saving with Pro
          </li>
        </ul>
        <Link href="/invoice-editor" className="button primary">
          Open invoice editor <ArrowUpRight size={18} />
        </Link>
        <small>No account needed to start. Save a draft backup before closing.</small>
        <Link href="/dashboard?view=invoices" className={s.saved}>
          Open saved invoices <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className={s.visual} aria-hidden="true">
        <div className={s.caption}>
          <LayoutTemplate size={15} /> A LITTLE PREVIEW OF WHAT’S POSSIBLE
        </div>
        <div className={s.paper}>
          <div className={s.paperHeading}>
            <strong>INVOICE</strong>
            <span>
              NORTH
              <br />& FORM.
            </span>
          </div>
          <div className={s.parties}>
            <span>
              FROM<b>Your business</b>
            </span>
            <span>
              BILL TO<b>Your customer</b>
            </span>
          </div>
          <div className={s.row}>
            <span>Project design</span>
            <b>600.00</b>
          </div>
          <div className={s.row}>
            <span>Final deliverables</span>
            <b>200.00</b>
          </div>
          <div className={s.total}>
            <span>Balance due</span>
            <strong>USD 800.00</strong>
          </div>
          <p>Thank you for the opportunity to work together.</p>
        </div>
        <span className={s.badge}>
          <Check size={14} /> Made by you. Ready to send.
        </span>
      </div>
    </section>
  );
}

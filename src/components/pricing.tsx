'use client';
import { useUiTranslation, useLocalizedHref } from '@/components/ui-language';

import Link from 'next/link';
import { isLemonUrl } from '@/lib/lemon-squeezy';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  Cloud,
  FilePenLine,
  Gem,
  Link2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useAccount } from './account-provider';
import { signInHref } from '@/lib/auth-navigation';
import { accountFetch } from '@/lib/auth-client';
import type { ProPlan } from '@/lib/pro-types';
import type { PlanChoice } from '@/lib/plans';
import { DEFAULT_CATALOG, money, type PricingCatalog } from '@/lib/platform';
import { Skeleton, LoadingLabel } from './skeleton';
import { localizedOfferTerms } from '@/lib/i18n/format';
import s from './pricing.module.css';
import c from './pricing-compact.module.css';
export function Pricing({
  initialCatalog = DEFAULT_CATALOG,
  compact = false,
  checkoutInNewTab = false,
  signInInFooter = false,
  additionalPremiumTools = [],
}: {
  initialCatalog?: PricingCatalog;
  compact?: boolean;
  checkoutInNewTab?: boolean;
  signInInFooter?: boolean;
  additionalPremiumTools?: string[];
}) {
  const tr = useUiTranslation();
  const href = useLocalizedHref();

  const { user, access } = useAccount();
  const [plans, setPlans] = useState<ProPlan[]>([]),
    [plan, setPlan] = useState<PlanChoice>(initialCatalog.trialEnabled ? 'trial' : 'month'),
    [catalog, setCatalog] = useState(initialCatalog),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    const selectedPlan = new URLSearchParams(window.location.search).get('plan');
    if (selectedPlan === 'trial' || selectedPlan === 'month') setPlan(selectedPlan);
    fetch('/api/billing/plans')
      .then(async (r) => {
        if (!r.ok) throw new Error('Plan prices could not be loaded. Try refreshing the page.');
        return r.json();
      })
      .then((d) => {
        if (!cancelled) {
          setPlans(d.plans);
          if (d.catalog) {
            setCatalog(d.catalog);
            if (!d.catalog.trialEnabled) setPlan('month');
          }
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const selected = { label: money(plan === 'trial' ? catalog.trialAmount : catalog.monthlyAmount) };
  const available = plans.some((p) => p.id === plan);
  async function checkout() {
    const tab = checkoutInNewTab ? window.open('about:blank', '_blank') : null;
    if (tab) tab.opener = null;
    setBusy(true);
    setError('');
    try {
      const response = await accountFetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, pricingVersion: catalog.version }),
      });
      const { url } = await response.json();
      const target = new URL(url);
      if (!isLemonUrl(target.href, 'checkout'))
        throw new Error('The checkout link could not be verified.');
      if (checkoutInNewTab) {
        if (!tab)
          throw new Error('Allow a new tab for checkout, then try again. Your edits remain here.');
        tab.location.href = target.href;
        setBusy(false);
      } else window.location.assign(target.href);
    } catch (e) {
      tab?.close();
      setError(e instanceof Error ? e.message : tr('Checkout could not be opened.'));
      setBusy(false);
    }
  }
  const proAction =
    !user && signInInFooter ? null : access.pro ? (
      <Link
        className="button primary full"
        href={href('/account')}
        target={checkoutInNewTab ? '_blank' : undefined}
        rel={checkoutInNewTab ? 'noopener noreferrer' : undefined}
      >
        {tr('Manage your Pro plan')} <ArrowRight size={16} />
      </Link>
    ) : loading ? (
      <div className="pricing-availability-skeleton" aria-busy="true">
        <LoadingLabel>{tr('Checking plan availability…')}</LoadingLabel>
        <Skeleton height={44} radius={7} />
      </div>
    ) : !available ? (
      <button className="button primary full" disabled>
        {tr('Checkout not available yet')}
      </button>
    ) : !user ? (
      <Link
        className="button primary full"
        href={signInHref(href(`/pricing?plan=${plan}`))}
        target={checkoutInNewTab ? '_blank' : undefined}
        rel={checkoutInNewTab ? 'noopener noreferrer' : undefined}
      >
        {plan === 'trial'
          ? tr('Sign in to start for {value0}', { value0: money(catalog.trialAmount) })
          : tr('Sign in to subscribe')}{' '}
        <ArrowRight size={16} />
      </Link>
    ) : (
      <button className="button primary full" disabled={busy} onClick={checkout}>
        {busy ? <Loader2 size={16} className="spin" /> : null}
        {plan === 'trial'
          ? tr('Start {value0} days for {value1}', {
              value0: catalog.trialDays,
              value1: money(catalog.trialAmount),
            })
          : tr('Subscribe for {value0}/month', { value0: money(catalog.monthlyAmount) })}{' '}
        <ArrowRight size={16} />
      </button>
    );
  const planSwitch = (
    <div className="pricing-switch" role="group" aria-label={tr('Pro plan')}>
      {catalog.trialEnabled && (
        <button aria-pressed={plan === 'trial'} onClick={() => setPlan('trial')}>
          {tr('{days}-day trial', { days: catalog.trialDays })}
        </button>
      )}
      <button aria-pressed={plan === 'month'} onClick={() => setPlan('month')}>
        {tr('Monthly')}
      </button>
    </div>
  );
  const renewal =
    plan === 'trial'
      ? tr('Then {amount}/month. All prices in USD.', { amount: money(catalog.monthlyAmount) })
      : tr('Billed monthly in USD.');

  if (compact)
    return (
      <div className={c.pricing}>
        <div className={c.selection}>
          <span>{tr('Choose your Pro billing')}</span>
          {planSwitch}
        </div>
        <div className="pricing-grid compact-pricing">
          <article className={`price-card featured ${c.card}`} aria-label={catalog.name}>
            <div className={c.overview}>
              <div className={c.planHeading}>
                <span className={c.icon}>
                  <Gem size={21} aria-hidden="true" />
                </span>
                <h3>{catalog.name}</h3>
                <span className={c.badge}>{tr('ALL PRO FEATURES')}</span>
              </div>
              <div className={c.priceLine}>
                <div className={`plan-price ${c.amount}`}>
                  {selected.label}
                  <span>
                    {plan === 'trial'
                      ? tr(' for {days} days', { days: catalog.trialDays })
                      : tr(' / month')}
                  </span>
                </div>
                <p className={`plan-renewal ${c.renewal}`}>{tr(renewal)}</p>
              </div>
            </div>
            <div className={c.allowances}>
              <div>
                <Cloud size={19} aria-hidden="true" />
                <div>
                  <strong>
                    {plan === 'trial' ? tr('1 GB trial storage') : tr('Unlimited storage')}
                  </strong>
                  <span>
                    {plan === 'trial'
                      ? tr('Unlimited when monthly billing begins')
                      : tr('Private cloud storage')}
                  </span>
                </div>
              </div>
              <div>
                <Link2 size={19} aria-hidden="true" />
                <div>
                  <strong>{tr('1,000 saved links')}</strong>
                  <span>{tr('Custom aliases & QR codes')}</span>
                </div>
              </div>
            </div>
            {proAction && <div className={c.action}>{proAction}</div>}
          </article>
        </div>
        <div className={c.terms}>
          <h4>{tr('Billing details')}</h4>
          <p>{localizedOfferTerms(catalog, plan, tr)}</p>
          {plan === 'trial' && (
            <p>{tr('One introductory offer per account. Includes all Pro features.')}</p>
          )}
          {!loading && !available && (
            <p>{tr('This offer is not accepting purchases right now.')}</p>
          )}
        </div>
        {error && (
          <p role="alert" className="error-message">
            {tr(error)}
          </p>
        )}
      </div>
    );
  return (
    <div className={s.pricing}>
      <div className={s.selection}>
        <div>
          <span className={s.eyebrow}>{tr('FIND YOUR FIT')}</span>
          <h2>{tr('One workspace. Two ways to work.')}</h2>
        </div>
        <div className={s.billingChoice}>
          <span>{tr('Choose your Pro billing')}</span>
          {planSwitch}
        </div>
      </div>
      <div className={'pricing-grid ' + s.grid}>
        <article className={'price-card ' + s.card} aria-labelledby="free-plan-title">
          <div className={s.overview}>
            <div className={s.tierLine}>
              <span className={s.planIcon}>
                <FilePenLine size={22} aria-hidden="true" />
              </span>
              <span className={s.badge}>{tr('FREE FOREVER')}</span>
            </div>
            <h2 id="free-plan-title">{tr('Folio Free')}</h2>
            <p className={s.description}>
              {tr('Everyday tools for your documents, images, and links.')}
            </p>
            <div className={'plan-price ' + s.amount}>
              $0 <span>{tr('always free')}</span>
            </div>
            <p className={'plan-renewal ' + s.renewal}>{tr('No subscription. No card needed.')}</p>
            <Link className={'button secondary full ' + s.cta} href={href('/tools')}>
              {tr('Start with free tools')} <ArrowRight size={17} />
            </Link>
          </div>
          <div className={s.allowances}>
            <div>
              <Cloud size={18} aria-hidden="true" />
              <span>
                <strong>{tr('100 MB')}</strong>
                <small>{tr('Private cloud storage')}</small>
              </span>
            </div>
            <div>
              <Link2 size={18} aria-hidden="true" />
              <span>
                <strong>{tr('10 links')}</strong>
                <small>{tr('Saved to your account')}</small>
              </span>
            </div>
          </div>
          <div className={s.features}>
            <p className={s.included}>{tr('Everything you need to get started.')}</p>
            <FeatureGroup
              title={tr('PDFs & documents')}
              items={[
                'Add text, highlights, images, and signatures',
                'Merge, split, compress, crop, and organize PDFs',
                'Fill forms and create fillable fields',
                'Create invoice PDFs with logos, tax, and discounts',
              ]}
            />
            <FeatureGroup
              title={tr('Images & conversion')}
              items={[
                'Convert PDF pages to JPG or PNG and extract text',
                'Convert images to PDF, JPG to WEBP, and WEBP to JPG',
                'Compress images, adjust photos, and create QR codes',
              ]}
            />
            <FeatureGroup
              title={tr('Links & sharing')}
              items={[
                '10 saved short links with random aliases',
                'Short-link QR downloads in PNG and SVG',
              ]}
            />
          </div>
          <div className={s.cardFooter}>
            <ShieldCheck size={18} aria-hidden="true" />
            <p>{tr('Free downloads without a subscription or added watermark.')}</p>
          </div>
        </article>
        <article
          className={'price-card featured ' + s.card + ' ' + s.pro}
          aria-labelledby="pro-plan-title"
        >
          <div className={s.overview}>
            <div className={s.tierLine}>
              <span className={s.planIcon}>
                <Gem size={22} aria-hidden="true" />
              </span>
              <span className={s.badge}>
                {access.pro ? tr('YOUR CURRENT PLAN') : tr('MORE POSSIBILITIES')}
              </span>
            </div>
            <h2 id="pro-plan-title">{catalog.name}</h2>
            <p className={s.description}>
              {tr('Advanced PDF editing, custom links, and room to grow.')}
            </p>
            <div className={'plan-price ' + s.amount}>
              {selected.label}
              <span>
                {plan === 'trial'
                  ? tr(' for {days} days', { days: catalog.trialDays })
                  : tr(' / month')}
              </span>
            </div>
            <p className={'plan-renewal ' + s.renewal}>{tr(renewal)}</p>
            <div className={s.cta}>{proAction}</div>
          </div>
          <div className={s.allowances}>
            <div>
              <Cloud size={18} aria-hidden="true" />
              <span>
                <strong>{plan === 'trial' ? tr('1 GB') : tr('Unlimited')}</strong>
                <small>
                  {plan === 'trial' ? tr('Trial cloud storage') : tr('Private cloud storage')}
                </small>
              </span>
            </div>
            <div>
              <Link2 size={18} aria-hidden="true" />
              <span>
                <strong>{tr('1,000 links')}</strong>
                <small>{tr('With custom aliases')}</small>
              </span>
            </div>
          </div>
          <div className={s.features}>
            <p className={s.included}>
              <Check size={16} aria-hidden="true" />
              {tr('Everything in Folio Free, plus:')}
            </p>
            <FeatureGroup
              title={tr('Advanced PDF tools')}
              items={[
                'Replace and delete existing PDF text',
                'Change replacement fonts, sizes, and colors',
                'Find and replace across the document',
                'AES-256 password protection',
                ...additionalPremiumTools.map((name) => tr('{name} downloads', { name: tr(name) })),
              ]}
            />
            <FeatureGroup
              title={tr('Links & storage')}
              items={[
                '1,000 saved short links with custom aliases',
                'Edit destinations without changing links or QR codes',
                plan === 'trial'
                  ? '1 GB during your trial, then unlimited storage with monthly billing'
                  : 'Unlimited private cloud storage',
              ]}
            />
            <FeatureGroup
              title={tr('Invoice studio')}
              items={[
                '10 premium invoice PDF designs',
                'Custom brand colors, footers, and payment QR codes',
                'Save and update up to 200 private invoices',
              ]}
            />
            <p className={s.limit}>
              {tr('Text editing and protection: up to 10 MB and 100 pages per file.')}
            </p>
          </div>
          <div className={s.cardFooter}>
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              {tr(
                'Secure checkout with Lemon Squeezy. Manage your subscription from your account.',
              )}
            </p>
          </div>
        </article>
      </div>
      {error && (
        <p role="alert" className="error-message">
          {tr(error)}
        </p>
      )}
      <div className={s.terms}>
        <div>
          <h3>{tr('Clear pricing. No surprises.')}</h3>
          <p>{localizedOfferTerms(catalog, plan, tr)}</p>
          {plan === 'trial' && (
            <p>{tr('One introductory offer per account. Includes all Pro features.')}</p>
          )}
          {!loading && !available && (
            <p>{tr('This offer is not accepting purchases right now.')}</p>
          )}
        </div>
        <Link className="text-link" href={href('/edit-pdf-text?demo=1')}>
          {tr('Try a sample before choosing')} <ArrowRight size={17} />
        </Link>
      </div>
      <p className={s.notes}>
        {tr(
          'PDF editing and previews are free; premium file downloads require a plan. Short links require sign-in on both plans. The editor saves PDFs and changes to private cloud storage; opening passwords are never saved. Premium downloads allow up to 20 requests per minute and 500 per day. Each tool’s file and page limits still apply.',
        )}
      </p>
    </div>
  );
}
function FeatureGroup({ title, items }: { title: string; items: string[] }) {
  const tr = useUiTranslation();

  return (
    <section className={s.featureGroup}>
      <h3>{tr(title)}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <Check size={16} aria-hidden="true" />
            <span>{tr(item)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

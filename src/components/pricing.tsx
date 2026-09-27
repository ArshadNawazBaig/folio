'use client';
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
import { DEFAULT_CATALOG, money, offerTerms, type PricingCatalog } from '@/lib/platform';
import { Skeleton, LoadingLabel } from './skeleton';
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
      setError(e instanceof Error ? e.message : 'Checkout could not be opened.');
      setBusy(false);
    }
  }
  const proAction =
    !user && signInInFooter ? null : access.pro ? (
      <Link
        className="button primary full"
        href="/account"
        target={checkoutInNewTab ? '_blank' : undefined}
        rel={checkoutInNewTab ? 'noopener noreferrer' : undefined}
      >
        Manage your Pro plan <ArrowRight size={16} />
      </Link>
    ) : loading ? (
      <div className="pricing-availability-skeleton" aria-busy="true">
        <LoadingLabel>Checking plan availability…</LoadingLabel>
        <Skeleton height={44} radius={7} />
      </div>
    ) : !available ? (
      <button className="button primary full" disabled>
        Checkout not available yet
      </button>
    ) : !user ? (
      <Link
        className="button primary full"
        href={signInHref(`/pricing?plan=${plan}`)}
        target={checkoutInNewTab ? '_blank' : undefined}
        rel={checkoutInNewTab ? 'noopener noreferrer' : undefined}
      >
        {plan === 'trial'
          ? `Sign in to start for ${money(catalog.trialAmount)}`
          : 'Sign in to subscribe'}{' '}
        <ArrowRight size={16} />
      </Link>
    ) : (
      <button className="button primary full" disabled={busy} onClick={checkout}>
        {busy ? <Loader2 size={16} className="spin" /> : null}
        {plan === 'trial'
          ? `Start ${catalog.trialDays} days for ${money(catalog.trialAmount)}`
          : `Subscribe for ${money(catalog.monthlyAmount)}/month`}{' '}
        <ArrowRight size={16} />
      </button>
    );
  const planSwitch = (
    <div className="pricing-switch" role="group" aria-label="Pro plan">
      {catalog.trialEnabled && (
        <button aria-pressed={plan === 'trial'} onClick={() => setPlan('trial')}>
          {catalog.trialDays}-day trial
        </button>
      )}
      <button aria-pressed={plan === 'month'} onClick={() => setPlan('month')}>
        Monthly
      </button>
    </div>
  );
  const renewal =
    plan === 'trial'
      ? 'Then ' + money(catalog.monthlyAmount) + '/month. All prices in USD.'
      : 'Billed monthly in USD.';

  if (compact)
    return (
      <div className={c.pricing}>
        <div className={c.selection}>
          <span>Choose your Pro billing</span>
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
                <span className={c.badge}>ALL PRO FEATURES</span>
              </div>
              <div className={c.priceLine}>
                <div className={`plan-price ${c.amount}`}>
                  {selected.label}
                  <span>
                    {plan === 'trial' ? ' for ' + catalog.trialDays + ' days' : ' / month'}
                  </span>
                </div>
                <p className={`plan-renewal ${c.renewal}`}>{renewal}</p>
              </div>
            </div>
            <div className={c.allowances}>
              <div>
                <Cloud size={19} aria-hidden="true" />
                <div>
                  <strong>{plan === 'trial' ? '1 GB trial storage' : 'Unlimited storage'}</strong>
                  <span>
                    {plan === 'trial'
                      ? 'Unlimited when monthly billing begins'
                      : 'Private cloud storage'}
                  </span>
                </div>
              </div>
              <div>
                <Link2 size={19} aria-hidden="true" />
                <div>
                  <strong>1,000 saved links</strong>
                  <span>Custom aliases & QR codes</span>
                </div>
              </div>
            </div>
            {proAction && <div className={c.action}>{proAction}</div>}
          </article>
        </div>
        <div className={c.terms}>
          <h4>Billing details</h4>
          <p>{offerTerms(catalog, plan)}</p>
          {plan === 'trial' && (
            <p>One introductory offer per account. Includes all Pro features.</p>
          )}
          {!loading && !available && <p>This offer is not accepting purchases right now.</p>}
        </div>
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
      </div>
    );
  return (
    <div className={s.pricing}>
      <div className={s.selection}>
        <div>
          <span className={s.eyebrow}>FIND YOUR FIT</span>
          <h2>One workspace. Two ways to work.</h2>
        </div>
        <div className={s.billingChoice}>
          <span>Choose your Pro billing</span>
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
              <span className={s.badge}>FREE FOREVER</span>
            </div>
            <h2 id="free-plan-title">Folio Free</h2>
            <p className={s.description}>Everyday tools for your documents, images, and links.</p>
            <div className={'plan-price ' + s.amount}>
              $0 <span>always free</span>
            </div>
            <p className={'plan-renewal ' + s.renewal}>No subscription. No card needed.</p>
            <Link className={'button secondary full ' + s.cta} href="/tools">
              Start with free tools <ArrowRight size={17} />
            </Link>
          </div>
          <div className={s.allowances}>
            <div>
              <Cloud size={18} aria-hidden="true" />
              <span>
                <strong>100 MB</strong>
                <small>Private cloud storage</small>
              </span>
            </div>
            <div>
              <Link2 size={18} aria-hidden="true" />
              <span>
                <strong>10 links</strong>
                <small>Saved to your account</small>
              </span>
            </div>
          </div>
          <div className={s.features}>
            <p className={s.included}>Everything you need to get started.</p>
            <FeatureGroup
              title="PDFs & documents"
              items={[
                'Add text, highlights, images, and signatures',
                'Merge, split, compress, crop, and organize PDFs',
                'Fill forms and create fillable fields',
              ]}
            />
            <FeatureGroup
              title="Images & conversion"
              items={[
                'Convert PDF pages to JPG or PNG and extract text',
                'Convert images to PDF, JPG to WEBP, and WEBP to JPG',
                'Compress images, adjust photos, and create QR codes',
              ]}
            />
            <FeatureGroup
              title="Links & sharing"
              items={[
                '10 saved short links with random aliases',
                'Short-link QR downloads in PNG and SVG',
              ]}
            />
          </div>
          <div className={s.cardFooter}>
            <ShieldCheck size={18} aria-hidden="true" />
            <p>Free downloads without a subscription or added watermark.</p>
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
                {access.pro ? 'YOUR CURRENT PLAN' : 'MORE POSSIBILITIES'}
              </span>
            </div>
            <h2 id="pro-plan-title">{catalog.name}</h2>
            <p className={s.description}>Advanced PDF editing, custom links, and room to grow.</p>
            <div className={'plan-price ' + s.amount}>
              {selected.label}
              <span>{plan === 'trial' ? ' for ' + catalog.trialDays + ' days' : ' / month'}</span>
            </div>
            <p className={'plan-renewal ' + s.renewal}>{renewal}</p>
            <div className={s.cta}>{proAction}</div>
          </div>
          <div className={s.allowances}>
            <div>
              <Cloud size={18} aria-hidden="true" />
              <span>
                <strong>{plan === 'trial' ? '1 GB' : 'Unlimited'}</strong>
                <small>{plan === 'trial' ? 'Trial cloud storage' : 'Private cloud storage'}</small>
              </span>
            </div>
            <div>
              <Link2 size={18} aria-hidden="true" />
              <span>
                <strong>1,000 links</strong>
                <small>With custom aliases</small>
              </span>
            </div>
          </div>
          <div className={s.features}>
            <p className={s.included}>
              <Check size={16} aria-hidden="true" />
              Everything in Folio Free, plus:
            </p>
            <FeatureGroup
              title="Advanced PDF tools"
              items={[
                'Replace and delete existing PDF text',
                'Change replacement fonts, sizes, and colors',
                'Find and replace across the document',
                'AES-256 password protection',
                ...additionalPremiumTools.map((name) => name + ' downloads'),
              ]}
            />
            <FeatureGroup
              title="Links & storage"
              items={[
                '1,000 saved short links with custom aliases',
                'Edit destinations without changing links or QR codes',
                plan === 'trial'
                  ? '1 GB during your trial, then unlimited storage with monthly billing'
                  : 'Unlimited private cloud storage',
              ]}
            />
            <p className={s.limit}>
              Text editing and protection: up to 10 MB and 100 pages per file.
            </p>
          </div>
          <div className={s.cardFooter}>
            <ShieldCheck size={18} aria-hidden="true" />
            <p>Secure checkout with Lemon Squeezy. Manage your subscription from your account.</p>
          </div>
        </article>
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className={s.terms}>
        <div>
          <h3>Clear pricing. No surprises.</h3>
          <p>{offerTerms(catalog, plan)}</p>
          {plan === 'trial' && (
            <p>One introductory offer per account. Includes all Pro features.</p>
          )}
          {!loading && !available && <p>This offer is not accepting purchases right now.</p>}
        </div>
        <Link className="text-link" href="/edit-pdf-text?demo=1">
          Try a sample before choosing <ArrowRight size={17} />
        </Link>
      </div>
      <p className={s.notes}>
        PDF editing and previews are free; premium file downloads require a plan. Short links
        require sign-in on both plans. The editor saves PDFs and changes to private cloud storage;
        opening passwords are never saved. Premium downloads allow up to 20 requests per minute and
        500 per day. Each tool’s file and page limits still apply.
      </p>
    </div>
  );
}
function FeatureGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <section className={s.featureGroup}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <Check size={16} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

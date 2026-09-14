'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Gem, Loader2, ShieldCheck } from 'lucide-react';
import { useAccount } from './account-provider';
import { signInHref } from '@/lib/auth-navigation';
import { accountFetch } from '@/lib/auth-client';
import type { ProPlan } from '@/lib/pro-types';
import type { PlanChoice } from '@/lib/plans';
import { DEFAULT_CATALOG, money, offerTerms, type PricingCatalog } from '@/lib/platform';
export function Pricing({
  initialCatalog = DEFAULT_CATALOG,
  compact = false,
  checkoutInNewTab = false,
}: {
  initialCatalog?: PricingCatalog;
  compact?: boolean;
  checkoutInNewTab?: boolean;
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
      if (target.protocol !== 'https:' || target.hostname !== 'checkout.stripe.com')
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
  return (
    <>
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
      <div className={`pricing-grid ${compact ? 'compact-pricing' : ''}`}>
        {!compact && (
          <article className="price-card">
            <span className="eyebrow">FOR THE EVERYDAY</span>
            <h2>Folio Free</h2>
            <p>All the essentials. Ready when you are.</p>
            <div className="plan-price">
              $0 <span>always free</span>
            </div>
            <p className="plan-renewal">No card needed.</p>
            <Link className="button secondary full" href="/tools">
              Start with free tools <ArrowRight size={16} />
            </Link>
            <ul>
              {[
                'Add text, highlights, images, and signatures',
                'Merge, split, rotate, and organize pages',
                'Convert PDFs to images and extract text',
                'Fill forms and create fillable fields',
                '100 MB of private cloud storage',
                'No account needed for local tools',
              ].map((item) => (
                <li key={item}>
                  <Check size={17} />
                  {item}
                </li>
              ))}
            </ul>
            <small>
              <ShieldCheck size={14} /> Free tools process PDFs on your device.
            </small>
          </article>
        )}
        <article className="price-card featured">
          <span className="pro-badge">
            <Gem size={13} /> MORE ROOM TO WORK
          </span>
          <h2>{catalog.name}</h2>
          <p>For changes that go a little deeper.</p>
          <div className="plan-price">
            {selected.label}
            <span>{plan === 'trial' ? ` for ${catalog.trialDays} days` : ' / month'}</span>
          </div>
          <p className="plan-renewal">
            {plan === 'trial'
              ? `Then ${money(catalog.monthlyAmount)}/month. All prices in USD.`
              : 'Billed monthly in USD.'}
          </p>
          {access.pro ? (
            <Link className="button primary full" href="/account">
              Manage your Pro plan <ArrowRight size={16} />
            </Link>
          ) : !available || loading ? (
            <button className="button primary full" disabled>
              {loading ? 'Checking availability…' : 'Checkout not available yet'}
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
          )}
          {!compact && (
            <ul>
              {[
                'Everything in Folio Free',
                '1 GB of private cloud storage',
                'Replace and delete existing PDF text',
                'Change replacement fonts, sizes, and colors',
                'Find and replace across the document',
                'AES-256 password protection',
                'Up to 10 MB and 100 pages per Pro file',
              ].map((item) => (
                <li key={item}>
                  <Check size={17} />
                  {item}
                </li>
              ))}
            </ul>
          )}
          <small>{offerTerms(catalog, plan)}</small>
          {plan === 'trial' && (
            <small>One introductory offer per account. Includes all Pro features.</small>
          )}
          {!loading && !available && (
            <small>This offer is not accepting purchases right now.</small>
          )}
        </article>
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      {!compact && (
        <>
          <p className="pricing-note">
            Pro PDF operations send your document to Folio for processing. Files and passwords are
            held in memory and are not saved to a document library. Limits: 500 operations per day
            and 20 per minute. Scans need OCR, which is not included.
          </p>
          <Link className="text-link pricing-demo-link" href="/edit-pdf-text?demo=1">
            Try original text editing with our sample <ArrowRight size={16} />
          </Link>
        </>
      )}
    </>
  );
}

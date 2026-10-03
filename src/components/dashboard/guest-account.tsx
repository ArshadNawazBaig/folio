'use client';
import { useUiTranslation, useUiLocale } from '../ui-language';
import { localizedHref } from '@/lib/i18n/translate';
import Link from 'next/link';
import { ArrowUpRight, Check, Clock3, Cloud, CreditCard, ShieldCheck } from 'lucide-react';
import { SignInForm } from '../sign-in-form';
import s from './guest-account.module.css';

export function GuestAccount({ view }: { view: 'billing' | 'settings' }) {
  const tr = useUiTranslation();
  const locale = useUiLocale();
  const href = (path: string) => localizedHref(locale, path);

  const billing = view === 'billing';
  const benefits = billing
    ? [
        'Everyday PDF tools, free to use',
        'Choose a plan when you need more',
        'Manage your subscription from your account',
      ]
    : [
        'Keep your files beyond the guest expiry',
        'Access your saved files on other devices',
        'Manage your profile and preferences',
      ];
  return (
    <section className={s.card} aria-labelledby="guest-account-title">
      <div className={s.formPanel}>
        <h2>{tr('Sign in to continue.')}</h2>
        <p className={s.intro}>{tr('Use Google or an email link. No password to remember.')}</p>
        <SignInForm
          variant="panel"
          allowGuest={false}
          destination={href(`/dashboard?view=${view}`)}
        />
      </div>
      <div className={s.overview}>
        <div className={s.topline}>
          <span className={s.icon} aria-hidden="true">
            {billing ? <CreditCard size={22} /> : <ShieldCheck size={22} />}
          </span>
          <span className={s.badge}>{tr('GUEST WORKSPACE')}</span>
        </div>
        <h2 id="guest-account-title">
          {billing ? tr('Your free guest account.') : tr('Make this workspace yours.')}
        </h2>
        <p className={s.description}>
          {billing
            ? tr(
                'Start with the essentials. Sign in to choose a paid plan or manage an existing subscription.',
              )
            : tr(
                'Sign in before your guest files expire to keep them in your account and pick up where you left off.',
              )}
        </p>
        <div className={s.allowances}>
          <div>
            <Cloud size={18} aria-hidden="true" />
            <div>
              <strong>{tr('100 MB')}</strong>
              <span>{tr('Private guest storage')}</span>
            </div>
          </div>
          <div>
            <Clock3 size={18} aria-hidden="true" />
            <div>
              <strong>{tr('24 hours')}</strong>
              <span>{tr('Guest file lifetime')}</span>
            </div>
          </div>
        </div>
        <ul className={s.benefits}>
          {benefits.map((benefit) => (
            <li key={benefit}>
              <Check size={16} aria-hidden="true" />
              <span>{tr(benefit)}</span>
            </li>
          ))}
        </ul>
        <div className={s.note}>
          <p>{tr('Guest files belong to this browser session. Sign in to keep them.')}</p>
          {billing && (
            <Link className="text-link" href={href('/pricing')}>
              {tr('Compare Free & Pro')} <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

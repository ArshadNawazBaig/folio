import { connection } from 'next/server';
import { translator, localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import Link from 'next/link';
import { Wrench, ArrowRight, RefreshCw, MessageSquare, UserRound, FileText } from 'lucide-react';
import { getPlatform } from '@/lib/server/platform';
import { DEFAULT_SETTINGS } from '@/lib/platform';
import { pageMetadata } from '@/lib/seo';
import s from '@/app/(english)/(public)/maintenance/maintenance.module.css';
export const dynamic = 'force-dynamic';
export const metadata = pageMetadata(
  'A little maintenance',
  'Folio will be back shortly.',
  '/maintenance',
  false,
);
export default async function Maintenance({ locale = 'en', messages = {} }: PageLanguage = {}) {
  await connection();
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);

  const { settings } = await getPlatform().catch(() => ({ settings: DEFAULT_SETTINGS }));
  return (
    <main id="main" className={s.page}>
      <header className={`page-heading ${s.hero}`}>
        <div className={s.heroInner}>
          <div className={s.intro}>
            <span className={s.status}>
              <span aria-hidden="true" />
              {tr('A little maintenance')}
            </span>
            <h1>
              {tr('A little care.')}
              <em>{tr('We’ll be right back.')}</em>
            </h1>
            <p className={s.message}>{tr(settings.maintenanceMessage)}</p>
            <a className={`button secondary ${s.retry}`} href={href('/')}>
              <RefreshCw size={17} aria-hidden="true" />
              {tr('Check again')}
            </a>
          </div>
          <div className={s.illustration} aria-hidden="true">
            <div className={s.orbit} />
            <div className={s.backSheet} />
            <div className={s.document}>
              <div className={s.documentHeader}>
                <FileText size={21} />
                <span>{tr('ROOM FOR GOOD WORK')}</span>
              </div>
              <span className={s.documentTitle} />
              <span className={s.documentLine} />
              <span className={s.documentLine} />
              <div className={s.documentBlock}>
                <span />
                <span />
                <span />
              </div>
              <div className={s.documentFooter}>
                <span />
                <span />
              </div>
            </div>
            <div className={s.toolBadge}>
              <Wrench size={38} strokeWidth={1.7} />
            </div>
          </div>
        </div>
      </header>
      <section className={s.help} aria-labelledby="maintenance-help-title">
        <div className={s.sectionHeading}>
          <span>{tr('STILL HERE FOR YOU')}</span>
          <h2 id="maintenance-help-title">{tr('Support and account access.')}</h2>
        </div>
        <div className={s.cards}>
          <article className={s.card}>
            <span className={s.cardIcon}>
              <MessageSquare size={23} aria-hidden="true" />
            </span>
            <div className={s.cardBody}>
              <h3>{tr('Need a hand?')}</h3>
              <p>
                {tr(
                  'Have a question or need help with your work? You can still reach us through support.',
                )}
              </p>
              <Link className="button primary" href={href('/support')}>
                {tr('Contact support')} <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </article>
          <article className={s.card}>
            <span className={`${s.cardIcon} ${s.accountIcon}`}>
              <UserRound size={23} aria-hidden="true" />
            </span>
            <div className={s.cardBody}>
              <h3>{tr('Your account stays within reach.')}</h3>
              <p>
                {tr(
                  'Sign in to manage your profile, review your billing, or cancel a subscription.',
                )}
              </p>
              <Link className="button secondary" href={href('/account')}>
                {tr('Manage account')} <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </article>
        </div>
        <p className={s.thanks}>
          {tr('Thanks for giving us a little room to make things better.')}
        </p>
      </section>
    </main>
  );
}

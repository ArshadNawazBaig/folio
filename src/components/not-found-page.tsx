'use client';
import { useUiTranslation, useLocalizedHref } from './ui-language';
import Link from 'next/link';
import { ArrowRight, CornerUpLeft, FileText, Home, Link2, MessageSquare } from 'lucide-react';
import s from './not-found-page.module.css';

const destinations = [
  {
    href: '/edit-pdf',
    icon: FileText,
    title: 'Edit a PDF',
    description: 'Open a document and make it yours.',
  },
  {
    href: '/url-shortener',
    icon: Link2,
    title: 'Shorten a link',
    description: 'Create a short link or a QR code.',
  },
  {
    href: '/support',
    icon: MessageSquare,
    title: 'Get some help',
    description: 'Find answers or reach our support team.',
  },
];

export function NotFoundPage() {
  const tr = useUiTranslation();
  const localHref = useLocalizedHref();
  return (
    <main id="main" className={s.page}>
      <header className={`page-heading ${s.hero}`}>
        <div className={s.heroInner}>
          <div className={s.intro}>
            <span className={s.status}>
              <span>404</span>
              {tr('Page not found')}
            </span>
            <h1>
              {tr('Let’s get you')} <em>{tr('back on track.')}</em>
            </h1>
            <p>
              {tr(
                'We couldn’t find the page you’re looking for. It may have moved, or the link may be incorrect.',
              )}
            </p>
            <div className={s.actions}>
              <Link href={localHref('/')} className="button primary">
                <Home size={17} aria-hidden="true" />
                {tr('Back to home')}
              </Link>
              <Link href={localHref('/tools')} className="button secondary">
                {tr('Explore tools')}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className={s.illustration} aria-hidden="true">
            <div className={s.orbit} />
            <div className={s.backSheet} />
            <div className={s.document}>
              <div className={s.documentHeader}>
                <FileText size={20} />
                <span />
                <span />
                <span />
              </div>
              <span className={s.errorCode}>404</span>
              <span className={s.documentLabel}>{tr('A PAGE OUT OF PLACE')}</span>
              <div className={s.documentLines}>
                <span />
                <span />
              </div>
            </div>
            <span className={s.returnBadge}>
              <CornerUpLeft size={32} strokeWidth={1.8} />
            </span>
          </div>
        </div>
      </header>
      <section className={s.recovery} aria-labelledby="recovery-title">
        <div className={s.sectionHeading}>
          <h2 id="recovery-title">{tr('Find what you need.')}</h2>
          <p>{tr('Your tools and support are still right here.')}</p>
        </div>
        <div className={s.cards}>
          {destinations.map(({ href, icon: Icon, title, description }) => (
            <Link key={href} href={localHref(href)} className={s.card}>
              <span className={`tool-icon ${s.cardIcon}`}>
                <Icon size={22} aria-hidden="true" />
              </span>
              <div className={s.cardBody}>
                <h3>{tr(title)}</h3>
                <p>{tr(description)}</p>
              </div>
              <ArrowRight className={s.cardArrow} size={18} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

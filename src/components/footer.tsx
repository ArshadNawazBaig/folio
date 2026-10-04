'use client';
import { FREE_LAUNCH } from '@/lib/access-policy';
import { localizedHref } from '@/lib/i18n/translate';
import { useUiLocale, useUiTranslation } from './ui-language';
import Link from 'next/link';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Logo } from './logo';
export function Footer() {
  const locale = useUiLocale();
  const tr = useUiTranslation();
  const href = (path: string) => localizedHref(locale, path);
  return (
    <footer className="site-footer" lang={locale}>
      <div className="footer-top container">
        <div className="footer-brand">
          <Logo light href={href('/')} label={tr('Folio home')} />
          <p>
            {tr('A little less paperwork.')}
            <br />
            {tr('A little more possibility.')}
          </p>
          <span className="privacy-tag">
            <ShieldCheck size={15} />
            {tr('Made for your peace of mind.')}
          </span>
        </div>
        <div>
          <h3>{tr('Make it yours')}</h3>
          <Link prefetch={false} href={href('/edit-pdf')}>
            {tr('Edit PDF')}
          </Link>
          <Link prefetch={false} href={href('/edit-pdf-text')}>
            {tr('PDF text editor')}
          </Link>
          <Link prefetch={false} href={href('/merge-pdf')}>
            {tr('Merge PDF')}
          </Link>
          <Link prefetch={false} href={href('/compress-pdf')}>
            {tr('Compress PDF')}
          </Link>
          <Link prefetch={false} href={href('/sign-pdf')}>
            {tr('Fill & sign')}
          </Link>
          <Link prefetch={false} href={href('/signature-generator')}>
            {tr('Signature generator')}
          </Link>
        </div>
        <div>
          <h3>{tr('Find your format')}</h3>
          <Link prefetch={false} href={href('/compress-images')}>
            {tr('Image compressor')}
          </Link>
          <Link prefetch={false} href={href('/pdf-to-jpg')}>
            {tr('PDF to JPG')}
          </Link>
          <Link prefetch={false} href={href('/pdf-to-png')}>
            {tr('PDF to PNG')}
          </Link>
          <Link prefetch={false} href={href('/image-to-pdf')}>
            {tr('Image to PDF')}
          </Link>
          <Link prefetch={false} href={href('/pdf-to-text')}>
            {tr('PDF to text')}
          </Link>
        </div>
        <div>
          <h3>{tr('Around Folio')}</h3>
          <Link href={href('/tools')}>
            {tr('Explore all tools')} <ArrowUpRight size={13} />
          </Link>
          <Link href={href('/guides')}>{tr('Helpful guides')}</Link>
          <Link href={href('/blog')}>{tr('The Folio blog')}</Link>
          {!FREE_LAUNCH && <Link href={href('/pricing')}>{tr('Pricing')}</Link>}
          <Link href={href('/support')}>{tr('Contact support')}</Link>
          <Link href={href('/about')}>{tr('About Folio')}</Link>
          <Link href={href('/privacy')}>{tr('Your privacy')}</Link>
          <Link href={href('/terms')}>{tr('Terms of service')}</Link>
          <Link href={href('/security')}>{tr('Report a security issue')}</Link>
          <a href={href('/feed.xml')}>{tr('Subscribe via RSS')}</a>
        </div>
      </div>
      <div className="footer-bottom container">
        <span>
          {tr('©')} {new Date().getFullYear()} {tr('Folio.')} {tr('Thoughtfully put together.')}
        </span>
        <span>{tr('Designed for the details.')}</span>
      </div>
    </footer>
  );
}

import type { Metadata, Viewport } from 'next';
import { Manrope, DM_Serif_Display } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import '@/app/globals.css';
import type { Locale } from '@/lib/i18n/config';
import { siteUrl, isIndexable } from '@/lib/seo';
import { AccountProvider } from '@/components/account-provider';
import { DownloadReady } from '@/components/download-ready';
import { SiteLanguageProvider } from '@/components/site-language-provider';
const sans = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const serif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-dm-serif',
  display: 'swap',
  preload: false,
});
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Folio — Online PDF Editor, Converter & Document Tools',
    template: '%s | Folio',
  },
  description:
    'A calmer way to work with PDFs. Edit, merge, split, convert, and fill documents in your browser with Folio.',
  applicationName: 'Folio',
  formatDetection: { telephone: false, address: false, email: false },
  robots: { index: isIndexable, follow: isIndexable },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: { url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' },
  },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#191919' };
export function RootDocument({
  children,
  locale = 'en',
  skip = 'Skip to content',
  messages = {},
}: Readonly<{
  children: React.ReactNode;
  locale?: Locale;
  skip?: string;
  messages?: Record<string, string>;
}>) {
  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${sans.variable} ${serif.variable}`}
    >
      <body>
        <a className="skip-link" href="#main">
          {skip}
        </a>
        <SiteLanguageProvider messages={messages} locale={locale}>
          <AccountProvider>{children}</AccountProvider>
          <DownloadReady />
        </SiteLanguageProvider>
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  );
}

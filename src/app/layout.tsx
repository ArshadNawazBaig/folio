import type { Metadata, Viewport } from 'next';
import { Manrope, DM_Serif_Display } from 'next/font/google';
import './globals.css';
import { siteUrl, isIndexable } from '@/lib/seo';
import { AccountProvider } from '@/components/account-provider';
const sans = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const serif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-dm-serif',
  display: 'swap',
});
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Folio — Your documents. Beautifully handled.', template: '%s | Folio' },
  description:
    'A calmer way to work with PDFs. Edit, merge, split, convert, and fill documents in your browser with Folio.',
  applicationName: 'Folio',
  robots: { index: isIndexable, follow: isIndexable },
  verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined },
  icons: { icon: '/icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f7f6f2' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <AccountProvider>{children}</AccountProvider>
      </body>
    </html>
  );
}

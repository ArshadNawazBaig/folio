import { localizedHref, type PageLanguage } from '@/lib/i18n/translate';
import { AccountPanel } from '@/components/account-panel';
import { safeAuthDestination } from '@/lib/auth-navigation';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Your Account — Folio',
  'Sign in to your private Folio dashboard for files, billing, profile settings, and support.',
  '/account',
  false,
);
export default async function Account({
  searchParams,
  locale = 'en',
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
} & PageLanguage) {
  const query = await searchParams;
  return (
    <main id="main" className="container account-page with-page-heading">
      <AccountPanel
        destination={safeAuthDestination(query.next ?? localizedHref(locale, '/account'))}
        adminRequired={query.notice === 'admin-required'}
      />
    </main>
  );
}

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
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const query = await searchParams;
  return (
    <main id="main" className="container account-page">
      <AccountPanel
        destination={safeAuthDestination(query.next)}
        adminRequired={query.notice === 'admin-required'}
      />
    </main>
  );
}

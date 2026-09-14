import { UserDashboard } from '@/components/dashboard/user-dashboard';
import { dashboardView } from '@/lib/dashboard';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Your dashboard',
  'Your private Folio files, billing, account settings, and support.',
  '/dashboard',
  false,
);
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; notice?: string; checkout?: string }>;
}) {
  const query = await searchParams;
  return (
    <UserDashboard
      view={dashboardView(query.view)}
      adminRequired={query.notice === 'admin-required'}
      checkoutSuccess={query.checkout === 'success'}
    />
  );
}

import { AdminDashboard } from '@/components/admin-dashboard';
import { pageMetadata } from '@/lib/seo';
import { adminSection } from '@/lib/admin-navigation';
export const metadata = pageMetadata(
  'Super admin — Folio',
  'Manage Folio accounts, pricing, subscriptions, support, and availability.',
  '/admin',
  false,
);
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return <AdminDashboard initialSection={adminSection(view)} />;
}

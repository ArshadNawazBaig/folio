import { AdminDashboard } from '@/components/admin-dashboard';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Super admin — Folio',
  'Manage Folio accounts, pricing, subscriptions, support, and availability.',
  '/admin',
  false,
);
export default function AdminPage() {
  return <AdminDashboard />;
}

import {
  DashboardPage,
  dashboardMetadata,
  type DashboardPageProps,
} from '@/components/dashboard/dashboard-page';
export function generateMetadata() {
  return dashboardMetadata('ja');
}
export default function Page(props: DashboardPageProps) {
  return <DashboardPage locale="ja" {...props} />;
}

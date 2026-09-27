import Link from 'next/link';
import { Wrench, ArrowRight } from 'lucide-react';
import { getPlatform } from '@/lib/server/platform';
import { DEFAULT_SETTINGS } from '@/lib/platform';
import { pageMetadata } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export const metadata = pageMetadata(
  'A little maintenance',
  'Folio will be back shortly.',
  '/maintenance',
  false,
);
export default async function Maintenance() {
  const { settings } = await getPlatform().catch(() => ({ settings: DEFAULT_SETTINGS }));
  return (
    <main id="main" className="container account-page with-page-heading">
      <header className="page-heading">
        <span className="eyebrow">A LITTLE MAINTENANCE</span>
        <h1>
          A little care <em>behind the scenes.</em>
        </h1>
        <p>{settings.maintenanceMessage}</p>
      </header>
      <div className="account-card">
        <span className="account-symbol">
          <Wrench size={28} />
        </span>
        <Link className="button primary" href="/support">
          Contact support <ArrowRight size={16} />
        </Link>
        <p>
          <Link href="/account">Manage your account or cancel a subscription</Link>
        </p>
      </div>
    </main>
  );
}

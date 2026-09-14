import { AuthCallback } from '@/components/auth-callback';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Signing In — Folio',
  'Finish signing in to your Folio account.',
  '/auth/callback',
  false,
);
export default function CallbackPage() {
  return (
    <main id="main" className="container account-page">
      <AuthCallback />
    </main>
  );
}

'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { useAccount } from './account-provider';
import { SignInForm } from './sign-in-form';
import { afterSignIn } from '@/lib/auth-navigation';
export function AccountPanel({
  destination = '/account',
  adminRequired = false,
}: {
  destination?: string;
  adminRequired?: boolean;
}) {
  const { user, access, loading, configured, error } = useAccount();
  const router = useRouter();
  useEffect(() => {
    if (user && !loading)
      router.replace(
        adminRequired && !access.admin
          ? '/dashboard?notice=admin-required'
          : afterSignIn(destination, !!access.admin),
      );
  }, [user, loading, access.admin, adminRequired, destination, router]);
  return (
    <div className="account-card">
      <span className="account-symbol">
        <Mail size={25} />
      </span>
      <h1>{destination === '/admin' ? 'Your control room awaits.' : 'Welcome to Folio.'}</h1>
      {loading || user ? (
        <p role="status">{user ? 'Opening your dashboard…' : 'Checking your account…'}</p>
      ) : (
        <>
          <p>
            {configured
              ? 'Your files, billing, and settings, together in one place. Sign in or create an account.'
              : 'Accounts and purchases are not connected yet. You can still explore the text editor sample and use the available tools.'}
          </p>
          {destination === '/admin' && (
            <p className="service-note">
              Use the account assigned as super admin. Your access is checked after sign-in.
            </p>
          )}
          <SignInForm destination={destination} />
          {!configured && (
            <Link className="text-link" href="/edit-pdf-text?demo=1">
              Explore the sample <ArrowRight size={16} />
            </Link>
          )}
        </>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowRight, Check, FolderOpen, Link2, Settings2 } from 'lucide-react';
import { useAccount } from './account-provider';
import { SignInForm } from './sign-in-form';
import { afterSignIn } from '@/lib/auth-navigation';
import { SignInSkeleton } from './skeleton';
import s from './account-panel.module.css';

const workspaceBenefits = [
  {
    icon: FolderOpen,
    title: 'Pick up where you left off',
    description: 'Keep your saved PDFs together in your dashboard.',
  },
  {
    icon: Link2,
    title: 'Save your links, too',
    description: 'Shorten URLs and create QR codes for easy sharing.',
  },
  {
    icon: Settings2,
    title: 'Make it yours',
    description: 'Manage your profile, storage, and plan in one place.',
  },
];
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
    <>
      <header className="page-heading">
        <span className="eyebrow">YOUR FOLIO ACCOUNT</span>
        <h1>
          {destination === '/admin' ? (
            'Your control room awaits.'
          ) : (
            <>
              Welcome to <em>Folio.</em>
            </>
          )}
        </h1>
        <p>Your files, links, and settings, together in one place.</p>
      </header>
      <div className={s.layout}>
        <section className={`account-card ${s.formPanel}`} aria-labelledby="sign-in-heading">
          <header className={s.formHeading}>
            <h2 id="sign-in-heading">Sign in to Folio.</h2>
            <p className={s.intro}>
              {destination === '/admin'
                ? 'Sign in to continue to your control room.'
                : 'New here? Signing in creates your free account.'}
            </p>
          </header>
          {loading || user ? (
            <SignInSkeleton />
          ) : (
            <>
              {!configured && (
                <p className="service-note">
                  Accounts and purchases are not connected yet. You can still explore the text
                  editor sample and use the available tools.
                </p>
              )}
              {destination === '/admin' && (
                <p className="service-note">
                  Use the account assigned as super admin. Your access is checked after sign-in.
                </p>
              )}
              <SignInForm destination={destination} variant="panel" />
              {!configured && (
                <Link className={`text-link ${s.sampleLink}`} href="/edit-pdf-text?demo=1">
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
        </section>
        <aside className={s.overview} aria-labelledby="workspace-heading">
          <div>
            <span className={s.eyebrow}>A LITTLE MORE ORGANIZED</span>
            <h2 id="workspace-heading">Keep your work in one place.</h2>
            <p className={s.description}>
              A space for your documents and the links you want to keep close.
            </p>
          </div>
          <ul className={s.benefits}>
            {workspaceBenefits.map(({ icon: Icon, title, description }) => (
              <li key={title}>
                <span className={s.benefitIcon}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className={s.freeNote}>
            <Check size={18} aria-hidden="true" />
            <div>
              <strong>Free to get started</strong>
              <p>No credit card required.</p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

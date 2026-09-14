'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { accountFetch, authClient } from '@/lib/auth-client';
import { afterSignIn, safeAuthDestination, signInHref } from '@/lib/auth-navigation';
export function AuthCallback() {
  const started = useRef(false),
    [error, setError] = useState(''),
    [destination, setDestination] = useState('/account');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const url = new URL(window.location.href),
      fragment = new URLSearchParams(url.hash.slice(1));
    const code = url.searchParams.get('code'),
      next = safeAuthDestination(url.searchParams.get('next'));
    const providerError = url.searchParams.get('error') || fragment.get('error');
    setDestination(next);
    // Remove authorization codes and provider errors from history before doing network work.
    window.history.replaceState(null, '', '/auth/callback');
    if (providerError) {
      setError(
        providerError === 'access_denied'
          ? 'Sign-in was cancelled. You can try Google again or use an email link.'
          : 'Sign-in could not finish. Please try again or use an email link.',
      );
      return;
    }
    const client = authClient();
    if (!client) {
      setError('Accounts are not connected yet. Please try again once sign-in is available.');
      return;
    }
    if (!code) {
      setError('This sign-in link is incomplete or has expired. Please start sign-in again.');
      return;
    }
    void (async () => {
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (error || !data.session) {
        setError(
          'This sign-in could not be verified. Use the browser where you started, or start sign-in again.',
        );
        return;
      }
      // Only the verified server response determines an admin landing destination.
      try {
        const access = await (await accountFetch('/api/account/access')).json();
        window.location.replace(afterSignIn(next, access.admin === true));
      } catch {
        window.location.replace('/account');
      }
    })().catch(() =>
      setError(
        'Sign-in could not finish. Please start again. Your local documents are still on this device.',
      ),
    );
  }, []);
  return (
    <div className="account-card">
      <h1>Welcome back.</h1>
      {error ? (
        <>
          <p role="alert" className="error-message">
            {error}
          </p>
          <Link className="button primary" href={signInHref(destination)}>
            Back to sign in
          </Link>
        </>
      ) : (
        <p role="status">Finishing your sign-in…</p>
      )}
    </div>
  );
}

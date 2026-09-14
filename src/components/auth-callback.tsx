'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { accountFetch, authClient } from '@/lib/auth-client';
import { afterSignIn, safeAuthDestination, signInHref } from '@/lib/auth-navigation';
import { claimGuestWorkspaces } from '@/lib/workspace-client';
export function AuthCallback() {
  const started = useRef(false),
    [error, setError] = useState(''),
    [returnToEditor, setReturnToEditor] = useState(false),
    [signedIn, setSignedIn] = useState(false),
    [destination, setDestination] = useState('/account');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const url = new URL(window.location.href),
      fragment = new URLSearchParams(url.hash.slice(1));
    const code = url.searchParams.get('code'),
      next = safeAuthDestination(url.searchParams.get('next'));
    const editorReturn = url.searchParams.get('return_to') === 'editor';
    setReturnToEditor(editorReturn);
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
      // Carry over every browser file, not only the PDF currently open in the editor.
      // A full account must not block sign-in; remaining guest files stay manageable in My files.
      await claimGuestWorkspaces(AbortSignal.timeout(10000)).catch(() => {});
      if (editorReturn) {
        // Supabase persists and broadcasts the verified session to the editor tab.
        // Never navigate that tab or reload its in-memory document state.
        setSignedIn(true);
        window.close();
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
        'Sign-in could not finish. Please try again. Your document is still in its editor tab.',
      ),
    );
  }, []);
  return (
    <div className="account-card">
      <h1>{signedIn ? 'You’re signed in.' : 'Welcome back.'}</h1>
      {signedIn ? (
        <>
          <p role="status">Return to your document tab to continue. Your edits have stayed open.</p>
          <button className="button primary" onClick={() => window.close()}>
            Close this tab
          </button>
        </>
      ) : error ? (
        <>
          <p role="alert" className="error-message">
            {error}
          </p>
          {returnToEditor ? (
            <>
              <p>
                Your edits are still in the editor. Close this tab and try Google sign-in again from
                your document.
              </p>
              <button className="button primary" onClick={() => window.close()}>
                Close this tab
              </button>
            </>
          ) : (
            <Link className="button primary" href={signInHref(destination)}>
              Back to sign in
            </Link>
          )}
        </>
      ) : (
        <p role="status">Finishing your sign-in…</p>
      )}
    </div>
  );
}

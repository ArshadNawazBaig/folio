'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Loader2, Mail, UserRound } from 'lucide-react';
import { authClient, googleSignInUrl } from '@/lib/auth-client';
import { authCallbackUrl, safeAuthDestination } from '@/lib/auth-navigation';
import { useAccount } from './account-provider';
export function SignInForm({
  destination = '/account',
  allowGuest = true,
}: {
  destination?: string;
  allowGuest?: boolean;
}) {
  const { configured, continueAsGuest } = useAccount();
  const router = useRouter();
  const [email, setEmail] = useState(''),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState<'google' | 'email' | 'guest' | null>(null),
    [error, setError] = useState('');
  const target = safeAuthDestination(destination);
  async function guestSignIn() {
    if (busy) return;
    setBusy('guest');
    setError('');
    try {
      await continueAsGuest();
      router.push(target.startsWith('/dashboard') ? target : '/dashboard');
    } catch {
      setError('Your guest session could not start. Please try again.');
      setBusy(null);
    }
  }
  async function google() {
    const client = authClient();
    if (!client || busy) return;
    setBusy('google');
    setError('');
    try {
      window.location.assign(await googleSignInUrl(target));
    } catch {
      setError('Google sign-in could not start. Please try again or use an email link.');
      setBusy(null);
    }
  }
  async function emailSignIn(event: React.FormEvent) {
    event.preventDefault();
    const client = authClient();
    if (!client || busy) return;
    setBusy('email');
    setError('');
    try {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: authCallbackUrl(window.location.origin, target) },
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The sign-in email could not be sent.');
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="sign-in-form">
      <button
        type="button"
        className="google-sign-in"
        disabled={!configured || !!busy}
        onClick={google}
      >
        <img src="/google-g.png" width={20} height={20} alt="" />
        <span>{busy === 'google' ? 'Connecting to Google…' : 'Continue with Google'}</span>
        {busy === 'google' && <Loader2 size={16} className="spin" />}
      </button>
      <div className="sign-in-divider">
        <span>or use your email</span>
      </div>
      {sent ? (
        <div className="sign-in-sent" role="status">
          <Mail size={23} />
          <h2>Check your inbox.</h2>
          <p>We sent a sign-in link to {email}. Open it in this browser to finish signing in.</p>
          <button type="button" className="text-link" onClick={() => setSent(false)}>
            Use another email
          </button>
        </div>
      ) : (
        <form onSubmit={emailSignIn}>
          <label>
            Email address
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!configured || !!busy}
            />
          </label>
          <button className="button primary full" disabled={!configured || !!busy}>
            {busy === 'email' ? 'Sending your link…' : 'Send sign-in link'}
            <ArrowRight size={16} />
          </button>
        </form>
      )}
      {!configured && (
        <p className="service-note">Sign-in will be available once accounts are connected.</p>
      )}
      {allowGuest && !target.startsWith('/admin') && (
        <div className="guest-sign-in-option">
          <button
            type="button"
            className="button secondary full"
            disabled={!!busy}
            onClick={() => void guestSignIn()}
          >
            {busy === 'guest' ? <Loader2 size={17} className="spin" /> : <UserRound size={17} />}
            {busy === 'guest' ? 'Opening your dashboard…' : 'Continue as guest'}
            <ArrowRight size={16} />
          </button>
          <p>100 MB of private storage in this browser. Guest files expire after 24 hours.</p>
        </div>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <small>
        By continuing, you acknowledge our <Link href="/privacy">privacy information</Link>.
      </small>
    </div>
  );
}

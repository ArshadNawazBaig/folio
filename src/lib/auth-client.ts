'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { authCallbackUrl } from './auth-navigation';
let client: SupabaseClient | undefined;
export class AccountRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function authClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
export async function googleSignInUrl(destination: string, returnToEditor = false) {
  const client = authClient();
  if (!client) throw new Error('Google sign-in is not connected yet.');
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: authCallbackUrl(window.location.origin, destination, returnToEditor),
      queryParams: { prompt: 'select_account' },
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in could not be started.');
  const url = new URL(data.url),
    service = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  if (
    url.origin !== service.origin ||
    url.pathname !== `${service.pathname.replace(/\/$/, '')}/auth/v1/authorize`
  )
    throw new Error('The sign-in address could not be verified.');
  return url.href;
}
export async function accountFetch(url: string, init: RequestInit = {}) {
  const client = authClient();
  if (!client) throw new Error('Accounts are not connected yet.');
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) throw new AccountRequestError(401, 'Sign in to access your account.');
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  const response = await fetch(url, { ...init, headers, cache: 'no-store' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new AccountRequestError(
      response.status,
      data.error || 'This request could not be completed.',
    );
  }
  return response;
}

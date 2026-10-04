'use client';
import { FREE_LAUNCH } from '@/lib/access-policy';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { accountFetch, existingAuthClient, AUTH_CLIENT_READY } from '@/lib/auth-client';
import type { AccountAccess } from '@/lib/pro-types';
import { workspaceRequest, WORKSPACE_SESSION_EVENT } from '@/lib/workspace-request';
const freeAccess: AccountAccess = {
  pro: FREE_LAUNCH,
  expiresAt: null,
  cancelAtPeriodEnd: false,
  billingReady: false,
  trial: false,
};
type Context = {
  user: User | null;
  guest: boolean;
  guestLoading: boolean;
  continueAsGuest: () => Promise<void>;
  signOutGuest: () => Promise<void>;
  access: AccountAccess;
  loading: boolean;
  configured: boolean;
  error: string;
  refresh: () => Promise<AccountAccess>;
};
const AccountContext = createContext<Context>({
  user: null,
  guest: false,
  guestLoading: true,
  continueAsGuest: async () => {},
  signOutGuest: async () => {},
  access: freeAccess,
  loading: true,
  configured: false,
  error: '',
  refresh: async () => freeAccess,
});
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const generation = useRef(0);
  const lastToken = useRef('');
  const guestGeneration = useRef(0);
  const guestChannel = useRef<BroadcastChannel | null>(null);
  const [guest, setGuest] = useState(false);
  const [guestLoading, setGuestLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null),
    [token, setToken] = useState(''),
    [access, setAccess] = useState(freeAccess),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const refreshGuest = useCallback(async () => {
    const current = ++guestGeneration.current;
    try {
      const result = lastToken.current
        ? { guest: false }
        : await (
            await workspaceRequest('/session', { signal: AbortSignal.timeout(10_000) })
          ).json();
      if (current === guestGeneration.current) setGuest(result.guest === true);
    } catch {
      // A temporary network failure should not sign an existing guest out of the header.
    } finally {
      if (current === guestGeneration.current) setGuestLoading(false);
    }
  }, []);
  const continueAsGuest = useCallback(async () => {
    const result = await (
      await workspaceRequest('/session', { method: 'POST', signal: AbortSignal.timeout(15_000) })
    ).json();
    guestGeneration.current++;
    setGuest(result.guest === true);
    setGuestLoading(false);
  }, []);
  const signOutGuest = useCallback(async () => {
    await workspaceRequest('/session', { method: 'DELETE', signal: AbortSignal.timeout(15_000) });
    guestGeneration.current++;
    setGuest(false);
    setGuestLoading(false);
    guestChannel.current?.postMessage('signed-out');
    // A full navigation also discards document data retained in the current dashboard.
    window.location.replace('/account');
  }, []);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('folio-guest-session');
    guestChannel.current = channel;
    channel.onmessage = (event) => {
      if (event.data === 'signed-out' && !lastToken.current) window.location.replace('/account');
    };
    return () => {
      guestChannel.current = null;
      channel.close();
    };
  }, []);
  useEffect(() => {
    void refreshGuest();
    const update = () => void refreshGuest();
    const visible = () => {
      if (document.visibilityState === 'visible') update();
    };
    window.addEventListener(WORKSPACE_SESSION_EVENT, update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', visible);
    return () => {
      // oxlint-disable-next-line react-hooks/exhaustive-deps -- Invalidate in-flight requests; this ref is a sequence counter, not a DOM node.
      guestGeneration.current++;
      window.removeEventListener(WORKSPACE_SESSION_EVENT, update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [token, refreshGuest]);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    if (!(await existingAuthClient())) {
      setLoading(false);
      return freeAccess;
    }
    setLoading(true);
    setError('');
    try {
      const result = await (await accountFetch('/api/account/access')).json();
      if (current === generation.current) setAccess(result);
      return current === generation.current ? (result as AccountAccess) : freeAccess;
    } catch (e) {
      if (current === generation.current) {
        setAccess(freeAccess);
        setError(e instanceof Error ? e.message : 'Your account could not be verified.');
      }
      return freeAccess;
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const connect = async () => {
      if (unsubscribe) return;
      try {
        const client = await existingAuthClient();
        if (!active || unsubscribe) return;
        if (!client) {
          setLoading(false);
          return;
        }
        const {
          data: { subscription },
        } = client.auth.onAuthStateChange((_event, session) => {
          if (lastToken.current !== (session?.access_token || '')) {
            generation.current++;
            setLoading(!!session);
            setAccess(freeAccess);
            lastToken.current = session?.access_token || '';
          }
          setUser(session?.user || null);
          setToken(session?.access_token || '');
          if (!session) {
            setAccess(freeAccess);
            setLoading(false);
            setError('');
          }
        });
        unsubscribe = () => subscription.unsubscribe();
      } catch {
        if (!active) return;
        setLoading(false);
        setError('Your account could not be checked. Please retry.');
      }
    };
    const update = () => void connect();
    // Sign-in may begin in this tab or complete in another tab while a guest is editing.
    window.addEventListener(AUTH_CLIENT_READY, update);
    window.addEventListener('storage', update);
    window.addEventListener('focus', update);
    void connect();
    return () => {
      active = false;
      unsubscribe?.();
      window.removeEventListener(AUTH_CLIENT_READY, update);
      window.removeEventListener('storage', update);
      window.removeEventListener('focus', update);
    };
  }, []);
  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);
  return (
    <AccountContext.Provider
      value={{
        user,
        guest: !user && guest,
        guestLoading,
        continueAsGuest,
        signOutGuest,
        access: FREE_LAUNCH ? { ...access, pro: true } : access,
        loading,
        configured: !!(
          process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ),
        error,
        refresh,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}
// oxlint-disable-next-line react/only-export-components -- Context and its hook form one API.
export function useAccount() {
  return useContext(AccountContext);
}

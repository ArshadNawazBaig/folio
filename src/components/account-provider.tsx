'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { accountFetch, authClient } from '@/lib/auth-client';
import type { AccountAccess } from '@/lib/pro-types';
const freeAccess: AccountAccess = {
  pro: false,
  expiresAt: null,
  cancelAtPeriodEnd: false,
  billingReady: false,
  trial: false,
};
type Context = {
  user: User | null;
  access: AccountAccess;
  loading: boolean;
  configured: boolean;
  error: string;
  refresh: () => Promise<AccountAccess>;
};
const AccountContext = createContext<Context>({
  user: null,
  access: freeAccess,
  loading: true,
  configured: false,
  error: '',
  refresh: async () => freeAccess,
});
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const generation = useRef(0);
  const lastToken = useRef('');
  const [user, setUser] = useState<User | null>(null),
    [token, setToken] = useState(''),
    [access, setAccess] = useState(freeAccess),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    if (!authClient()) {
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
        setError(e instanceof Error ? e.message : 'Your subscription could not be verified.');
      }
      return freeAccess;
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const client = authClient();
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
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (token) void refresh();
  }, [token, refresh]);
  return (
    <AccountContext.Provider
      value={{
        user,
        access,
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

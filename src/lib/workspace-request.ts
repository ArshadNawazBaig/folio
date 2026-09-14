'use client';
import { authClient, AccountRequestError } from './auth-client';

export const WORKSPACE_SESSION_EVENT = 'folio-workspace-session-changed';

// Keep session requests independent of PDF schemas and document font data.
export async function workspaceRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('x-folio-workspace', '1');
  const session = await authClient()?.auth.getSession();
  if (session?.data.session)
    headers.set('authorization', `Bearer ${session.data.session.access_token}`);
  const send = () =>
    fetch(`/api/workspaces${path}`, {
      ...init,
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
    });
  // Sign-in and root requests may create the HttpOnly cookie. Serialize them across tabs so
  // simultaneous first visits cannot replace each other's new guest identity.
  const response =
    (path === '' || path === '/session') && typeof navigator !== 'undefined' && navigator.locks
      ? await navigator.locks.request(
          'folio-guest-session',
          { signal: init.signal || undefined },
          send,
        )
      : await send();
  if (!response.ok) {
    const value = await response.json().catch(() => ({}));
    throw new AccountRequestError(
      response.status,
      value.error || 'Your document could not be saved. Please retry.',
    );
  }
  if (path === '' || (path === '/session' && init.method === 'POST'))
    window.dispatchEvent(new Event(WORKSPACE_SESSION_EVENT));
  return response;
}

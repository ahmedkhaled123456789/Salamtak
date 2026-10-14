import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as authApi from '../api/auth.api';
import { onSessionExpired } from '../api/client';
import { ApiError } from '../api/errors';
import { tokenStore } from '../api/tokens';
import type { AccountUser } from '../api/types';
import { ROLE_LABELS, isAdminRole, roleCan } from '../auth/permissions';

/**
 * Current administrator. Role checks here only shape the UI — every action is authorised again by the
 * backend. Tokens are never exposed through this context; they live in api/tokens.ts.
 */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
}

type Status = 'loading' | 'authenticated' | 'anonymous';

interface SessionContextValue {
  status: Status;
  user: SessionUser | null;
  can: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function toSessionUser(account: AccountUser): SessionUser {
  const name = `${account.firstName} ${account.lastName}`.trim() || account.email;
  return {
    id: account.id,
    name,
    email: account.email,
    role: account.role,
    roleLabel: isAdminRole(account.role) ? ROLE_LABELS[account.role] : account.role,
  };
}

const WRONG_APP = new ApiError(403, 'NOT_AN_ADMIN', 'This dashboard is only for administrators. Patients and nurses use the mobile app.');

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>(tokenStore.hasRefresh() ? 'loading' : 'anonymous');
  const [user, setUser] = useState<SessionUser | null>(null);

  const clearSession = useCallback(() => {
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  // Restore the session after a reload. The access token lives in memory only, so this first call gets a
  // 401, the HTTP client rotates the refresh token once and replays it — the same path as any expiry.
  useEffect(() => {
    if (status !== 'loading') return;
    let cancelled = false;
    authApi
      .me()
      .then(async (account) => {
        if (cancelled) return;
        if (!isAdminRole(account.role)) {
          await authApi.logout();
          clearSession();
          return;
        }
        setUser(toSessionUser(account));
        setStatus('authenticated');
      })
      .catch(() => {
        // A rejected refresh already cleared the tokens in the HTTP client. On a transient network error the
        // refresh token is kept, so reloading the tab retries; either way the user lands on the sign-in screen.
        if (!cancelled) clearSession();
      });
    return () => {
      cancelled = true;
    };
  }, [status, clearSession]);

  // The HTTP client could not refresh (refresh token expired/revoked/reused): drop everything and ask to sign in.
  useEffect(
    () =>
      onSessionExpired(() => {
        clearSession();
        toast.error('Your session has expired', { description: 'Please sign in again to continue.' });
      }),
    [clearSession],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const account = await authApi.login(email, password);
      if (!isAdminRole(account.role)) {
        await authApi.logout(); // revoke the session we just created
        throw WRONG_APP;
      }
      queryClient.clear();
      setUser(toSessionUser(account));
      setStatus('authenticated');
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    clearSession();
  }, [clearSession]);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      login,
      logout,
      can: (permission) => (user ? roleCan(user.role, permission) : false),
    }),
    [status, user, login, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionState(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionState must be used inside SessionProvider');
  return ctx;
}

/** For screens rendered behind <RequireAuth>, where a user is guaranteed to exist. */
export function useSession(): Omit<SessionContextValue, 'user'> & { user: SessionUser } {
  const ctx = useSessionState();
  if (!ctx.user) throw new Error('useSession requires an authenticated session');
  return { ...ctx, user: ctx.user };
}

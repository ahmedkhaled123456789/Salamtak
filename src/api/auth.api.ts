import { get, request } from './client';
import { tokenStore } from './tokens';
import type { AccountUser, LoginResult } from './types';

/** POST /auth/login -> { user, tokens }. A 401 here means bad credentials, never an expired session. */
export async function login(email: string, password: string): Promise<AccountUser> {
  const result = await request<LoginResult>({
    method: 'post',
    url: '/auth/login',
    data: { email, password },
    _skipAuth: true,
  });
  tokenStore.set(result.tokens);
  return result.user;
}

/** GET /users/me — the current account (used to restore a session after a reload). */
export const me = () => get<AccountUser>('/users/me');

/**
 * POST /auth/logout revokes the whole refresh-token family server-side. Local tokens are always cleared,
 * even if the network call fails, so signing out can never leave a usable session behind.
 */
export async function logout(): Promise<void> {
  const refreshToken = tokenStore.getRefresh();
  tokenStore.clear();
  if (!refreshToken) return;
  try {
    await request({ method: 'post', url: '/auth/logout', data: { refreshToken }, _skipAuth: true });
  } catch {
    /* best effort: the local session is already gone */
  }
}

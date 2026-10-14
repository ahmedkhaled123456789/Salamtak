/**
 * Token lifecycle for a backend that returns tokens in the JSON body (no cookies are set):
 *
 *  - Access token (short-lived JWT): kept in module memory only. Never written to any storage, so it is
 *    gone on reload and cannot be read back by other scripts via Web Storage.
 *  - Refresh token (rotating, single-use): kept in sessionStorage so a page reload in the same tab can
 *    restore the session via POST /auth/refresh. sessionStorage is tab-scoped and cleared when the tab
 *    closes; localStorage is deliberately not used. This is the trade-off for a bearer-token backend
 *    without an httpOnly-cookie option.
 */
const REFRESH_KEY = 'careflow.session';

let accessToken: string | null = null;

function readRefresh(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export const tokenStore = {
  getAccess: () => accessToken,
  getRefresh: readRefresh,
  hasRefresh: () => readRefresh() !== null,
  set(tokens: { accessToken: string; refreshToken: string }) {
    accessToken = tokens.accessToken;
    try {
      sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    } catch {
      /* storage unavailable: the session simply won't survive a reload */
    }
  },
  clear() {
    accessToken = null;
    try {
      sessionStorage.removeItem(REFRESH_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

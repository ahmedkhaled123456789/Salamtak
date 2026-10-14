import axios, { type AxiosRequestConfig } from 'axios';
import { ApiError, normalizeError } from './errors';
import { tokenStore } from './tokens';
import type { Envelope, Tokens } from './types';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Public auth endpoints: no bearer header, and a 401 is a real answer (e.g. wrong password), not an expiry. */
    _skipAuth?: boolean;
    /** Set once a request has been replayed after a token refresh, so it can never loop. */
    _retried?: boolean;
  }
}

/** `VITE_API_BASE_URL` (see .env.example). Defaults to the same-origin `/api/v1` served through the dev proxy. */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { Accept: 'application/json' },
});

/* ------------------------------ session expiry ------------------------------ */

type Listener = () => void;
const expiredListeners = new Set<Listener>();

/** Subscribe to "the session can no longer be refreshed". Returns an unsubscribe function. */
export function onSessionExpired(listener: Listener): () => void {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
}

function expireSession() {
  tokenStore.clear();
  expiredListeners.forEach((l) => l());
}

/* ------------------------------ token refresh ------------------------------- */

let refreshing: Promise<void> | null = null;

/**
 * Refresh tokens rotate and are single-use, so concurrent 401s MUST share one refresh call: a second
 * parallel refresh would present an already-used token and revoke the whole session family.
 */
export function refreshSession(): Promise<void> {
  if (refreshing) return refreshing;
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return Promise.reject(new ApiError(401, 'NO_SESSION', 'No active session.'));

  refreshing = axios
    .post<Envelope<Tokens>>(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 15_000 })
    .then((res) => {
      tokenStore.set(res.data.data);
    })
    .catch((err: unknown) => {
      const e = normalizeError(err);
      // A rejected refresh token (401/403) ends the session. A transient network/5xx failure does not.
      if (e.status === 401 || e.status === 403 || e.status === 400) expireSession();
      throw e;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

http.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token && !config._skipAuth) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.config) throw error;
    const config = error.config;
    // 401 = the access token is missing/expired -> refresh once and replay. 403 = authenticated but not
    // allowed -> never refresh, never log out; the caller shows "permission denied".
    if (error.response?.status === 401 && !config._skipAuth && !config._retried) {
      if (!tokenStore.hasRefresh()) {
        expireSession();
        throw error;
      }
      config._retried = true;
      try {
        await refreshSession();
      } catch {
        throw error;
      }
      return http.request(config);
    }
    throw error;
  },
);

/* ------------------------------- request helpers ----------------------------- */

type Params = Record<string, string | number | boolean | undefined | null>;

/** Drop empty filters so they are never sent ("all", "", undefined). */
export function cleanParams(params?: Params): Params | undefined {
  if (!params) return undefined;
  const out: Params = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || v === 'all') continue;
    out[k] = v;
  }
  return out;
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const res = await http.request<Envelope<T>>(config);
    return res.data.data;
  } catch (e) {
    throw normalizeError(e);
  }
}

export interface RequestOptions {
  signal?: AbortSignal;
}

export const get = <T>(url: string, params?: Params, opts: RequestOptions = {}) =>
  request<T>({ method: 'get', url, params: cleanParams(params), signal: opts.signal });

export const post = <T>(url: string, body?: unknown, extra: { idempotencyKey?: string } = {}) =>
  request<T>({
    method: 'post',
    url,
    data: body ?? {},
    headers: extra.idempotencyKey ? { 'Idempotency-Key': extra.idempotencyKey } : undefined,
  });

export const patch = <T>(url: string, body?: unknown) => request<T>({ method: 'patch', url, data: body ?? {} });

/**
 * The backend returns signed file links as root-relative paths ("/api/v1/files/..."). Resolve them against
 * the API origin when the API is hosted separately; same-origin (dev proxy) paths are returned untouched.
 */
export function resolveBackendUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (/^https?:\/\//i.test(API_BASE_URL)) return new URL(path, new URL(API_BASE_URL).origin).toString();
  return path;
}

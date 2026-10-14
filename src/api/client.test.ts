import axios from 'axios';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get, http, onSessionExpired, post } from './client';
import { ApiError } from './errors';
import { tokenStore } from './tokens';

interface Call {
  url: string;
  auth: string | undefined;
}

/** Replace the network with a scripted responder; records every request the client makes. */
function mockNetwork(respond: (call: Call, n: number) => { status: number; data?: unknown }) {
  const calls: Call[] = [];
  http.defaults.adapter = async (config: AxiosRequestConfig) => {
    const call = { url: String(config.url), auth: config.headers?.Authorization as string | undefined };
    calls.push(call);
    const { status, data } = respond(call, calls.length);
    const response = { status, data, statusText: '', headers: {}, config, request: {} } as AxiosResponse;
    if (status >= 400) throw Object.assign(new axios.AxiosError('failed', String(status), config as never, {}, response), { response });
    return response;
  };
  return calls;
}

const ok = (data: unknown) => ({ status: 200, data: { success: true, data, message: 'Success' } });
const fail = (status: number, errorCode: string) => ({ status, data: { success: false, message: 'nope', errorCode } });

beforeEach(() => {
  tokenStore.set({ accessToken: 'old-access', refreshToken: 'old-refresh' });
});

afterEach(() => {
  tokenStore.clear();
  vi.restoreAllMocks();
});

describe('http client', () => {
  it('sends the access token as a bearer header', async () => {
    const calls = mockNetwork(() => ok({ hello: 'world' }));
    await expect(get('/x')).resolves.toEqual({ hello: 'world' });
    expect(calls[0].auth).toBe('Bearer old-access');
  });

  it('refreshes once and replays when the access token expired', async () => {
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { data: { accessToken: 'new-access', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 900 } } });
    const calls = mockNetwork((c) => (c.auth === 'Bearer old-access' ? fail(401, 'UNAUTHENTICATED') : ok({ done: true })));

    await expect(get('/secure')).resolves.toEqual({ done: true });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.auth)).toEqual(['Bearer old-access', 'Bearer new-access']);
    expect(tokenStore.getRefresh()).toBe('new-refresh'); // rotated
  });

  it('shares ONE refresh between concurrent 401s (refresh tokens are single-use)', async () => {
    let resolveRefresh!: (v: unknown) => void;
    const refresh = vi.spyOn(axios, 'post').mockImplementation(() => new Promise((r) => (resolveRefresh = r)) as never);
    mockNetwork((c) => (c.auth === 'Bearer old-access' ? fail(401, 'UNAUTHENTICATED') : ok({ ok: 1 })));

    const all = Promise.all([get('/a'), get('/b'), get('/c')]);
    await vi.waitFor(() => expect(refresh).toHaveBeenCalled());
    resolveRefresh({ data: { data: { accessToken: 'new-access', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 900 } } });

    await expect(all).resolves.toHaveLength(3);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not loop: a request that still gets 401 after refresh fails once', async () => {
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { data: { accessToken: 'new-access', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 900 } } });
    const calls = mockNetwork(() => fail(401, 'UNAUTHENTICATED'));

    await expect(get('/secure')).rejects.toMatchObject({ status: 401 });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2); // original + exactly one replay
  });

  it('ends the session and clears tokens when the refresh token is rejected', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(Object.assign(new axios.AxiosError('x', '401'), { response: { status: 401, data: { errorCode: 'REFRESH_TOKEN_REUSED', message: 'x' } } }));
    mockNetwork(() => fail(401, 'UNAUTHENTICATED'));
    const expired = vi.fn();
    const off = onSessionExpired(expired);

    await expect(get('/secure')).rejects.toBeInstanceOf(ApiError);
    off();

    expect(expired).toHaveBeenCalledTimes(1);
    expect(tokenStore.getAccess()).toBeNull();
    expect(tokenStore.getRefresh()).toBeNull();
  });

  it('keeps the session on a transient refresh failure (network down)', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new axios.AxiosError('offline', 'ERR_NETWORK'));
    mockNetwork(() => fail(401, 'UNAUTHENTICATED'));
    const expired = vi.fn();
    const off = onSessionExpired(expired);

    await expect(get('/secure')).rejects.toBeInstanceOf(ApiError);
    off();

    expect(expired).not.toHaveBeenCalled();
    expect(tokenStore.getRefresh()).toBe('old-refresh');
  });

  it('treats 403 as permission-denied: no refresh, no sign-out', async () => {
    const refresh = vi.spyOn(axios, 'post');
    mockNetwork(() => fail(403, 'FORBIDDEN'));
    const expired = vi.fn();
    const off = onSessionExpired(expired);

    await expect(get('/admin/thing')).rejects.toMatchObject({ status: 403, isForbidden: true });
    off();

    expect(refresh).not.toHaveBeenCalled();
    expect(expired).not.toHaveBeenCalled();
    expect(tokenStore.getRefresh()).toBe('old-refresh');
  });

  it('expires the session on 401 when there is no refresh token to try', async () => {
    tokenStore.clear();
    tokenStore.set({ accessToken: 'a', refreshToken: 'r' });
    sessionStorage.clear(); // access token only, e.g. storage unavailable
    const refresh = vi.spyOn(axios, 'post');
    mockNetwork(() => fail(401, 'UNAUTHENTICATED'));
    const expired = vi.fn();
    const off = onSessionExpired(expired);

    await expect(get('/secure')).rejects.toMatchObject({ status: 401 });
    off();

    expect(refresh).not.toHaveBeenCalled();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('sends the Idempotency-Key header for sensitive writes', async () => {
    let seen: unknown;
    http.defaults.adapter = async (config) => {
      seen = config.headers?.['Idempotency-Key'];
      return { status: 201, data: { success: true, data: { ok: 1 }, message: 'Created' }, statusText: '', headers: {}, config, request: {} } as AxiosResponse;
    };
    await post('/admin/wallets/1/adjustments', { amountMinor: 5 }, { idempotencyKey: 'key-123' });
    expect(seen).toBe('key-123');
  });
});

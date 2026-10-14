import axios from 'axios';

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

/**
 * The only error type the UI ever sees. It carries a status and a stable machine code, plus a message
 * that is safe to show to an administrator: server (5xx) and network failures are replaced by generic
 * text, so stack traces, database errors and provider responses can never reach the screen.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];

  constructor(status: number, code: string, message: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isValidation() {
    return this.status === 400 || this.status === 422;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

const GENERIC_SERVER = 'Something went wrong on our side. Please try again in a moment.';
const GENERIC_NETWORK = "We couldn't reach the server. Check your connection and try again.";
const MAX_MESSAGE = 300;

interface ErrorBody {
  message?: unknown;
  errorCode?: unknown;
  details?: unknown;
}

function clean(text: unknown, fallback: string): string {
  return typeof text === 'string' && text.trim() ? text.trim().slice(0, MAX_MESSAGE) : fallback;
}

function parseDetails(raw: unknown): ApiErrorDetail[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((d): d is { field?: unknown; message: unknown } => typeof d === 'object' && d !== null && 'message' in d)
    .slice(0, 20)
    .map((d) => ({
      field: typeof d.field === 'string' ? d.field : undefined,
      message: clean(d.message, 'Invalid value'),
    }));
}

/** Convert anything thrown by the HTTP layer into an ApiError. Never exposes headers, tokens or bodies. */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (axios.isAxiosError(error)) {
    const res = error.response;
    if (!res) {
      const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
      return new ApiError(0, timedOut ? 'TIMEOUT' : 'NETWORK_ERROR', timedOut ? 'The request timed out. Please try again.' : GENERIC_NETWORK);
    }
    const body = (typeof res.data === 'object' && res.data !== null ? res.data : {}) as ErrorBody;
    const code = typeof body.errorCode === 'string' ? body.errorCode : `HTTP_${res.status}`;
    if (res.status >= 500) return new ApiError(res.status, code, GENERIC_SERVER);
    if (res.status === 401) return new ApiError(401, code, clean(body.message, 'Your session is not valid. Please sign in again.'));
    if (res.status === 403) return new ApiError(403, code, clean(body.message, "You don't have permission to do this."));
    if (res.status === 429) return new ApiError(429, code, 'Too many requests. Please wait a moment and try again.');
    return new ApiError(res.status, code, clean(body.message, 'The request could not be completed.'), parseDetails(body.details));
  }

  return new ApiError(0, 'UNKNOWN', GENERIC_SERVER);
}

/** Human-readable description of a failed load, used by list/detail error states. */
export function describeLoadError(error: unknown, what: string): { title: string; description: string } {
  const e = normalizeError(error);
  if (e.isForbidden) {
    return { title: 'Permission denied', description: `Your role doesn't have access to ${what}.` };
  }
  if (e.isUnauthorized) {
    return { title: 'Session expired', description: 'Please sign in again to continue.' };
  }
  if (e.isNetwork) {
    return { title: "Can't reach the server", description: e.message };
  }
  return { title: 'Something went wrong', description: `We couldn't load ${what}. ${e.status >= 500 ? 'The service may be temporarily unavailable.' : e.message}` };
}

/** Field-level validation text from a failed mutation, e.g. "reason: must be at least 5 characters". */
export function describeMutationError(error: unknown, fallback = "Couldn't complete the request. Nothing was changed."): string {
  const e = normalizeError(error);
  if (e.isForbidden) return "You don't have permission to do this.";
  if (e.isValidation && e.details.length) {
    return e.details
      .slice(0, 3)
      .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
      .join(' · ');
  }
  if (e.status >= 400 && e.status < 500 && e.status !== 401) return e.message;
  return e.isNetwork ? e.message : fallback;
}

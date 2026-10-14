import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { describeLoadError, describeMutationError, normalizeError } from './errors';

function axiosError(status: number, data: unknown) {
  const response = { status, data, statusText: '', headers: {}, config: {} } as AxiosResponse;
  return Object.assign(new axios.AxiosError('boom', String(status), undefined, {}, response), { response });
}

describe('normalizeError', () => {
  it('never leaks server (5xx) detail to the UI', () => {
    const e = normalizeError(axiosError(500, { message: 'MongoServerError: E11000 duplicate key at /srv/app/db.js:42', errorCode: 'INTERNAL' }));
    expect(e.status).toBe(500);
    expect(e.message).not.toMatch(/mongo|E11000|\/srv/i);
  });

  it('keeps validation details from 4xx answers', () => {
    const e = normalizeError(axiosError(400, { message: 'Validation failed', errorCode: 'VALIDATION_ERROR', details: [{ field: 'body.reason', message: 'must be at least 5 characters' }] }));
    expect(e.isValidation).toBe(true);
    expect(describeMutationError(e)).toBe('body.reason: must be at least 5 characters');
  });

  it('turns a missing response into a network error with generic text', () => {
    const e = normalizeError(new axios.AxiosError('connect ECONNREFUSED 10.0.0.5:5050', 'ERR_NETWORK'));
    expect(e.isNetwork).toBe(true);
    expect(e.message).not.toMatch(/10\.0\.0\.5|ECONNREFUSED/);
  });

  it('distinguishes 401 from 403 in user-facing text', () => {
    expect(describeLoadError(axiosError(403, { message: 'x' }), 'payouts').title).toBe('Permission denied');
    expect(describeLoadError(axiosError(401, { message: 'x' }), 'payouts').title).toBe('Session expired');
  });

  it('caps long server messages', () => {
    const e = normalizeError(axiosError(409, { message: 'x'.repeat(5000), errorCode: 'CONFLICT' }));
    expect(e.message.length).toBeLessThanOrEqual(300);
  });
});

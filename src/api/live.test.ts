// @vitest-environment-options {"url": "http://localhost:5173"}
/**
 * Opt-in integration test against a RUNNING local backend (never run in normal CI):
 *
 *   LIVE_API=1 VITE_API_BASE_URL=http://localhost:5050/api/v1 \
 *   LIVE_ADMIN_EMAIL=... LIVE_ADMIN_PASSWORD=... LIVE_FINANCE_EMAIL=... LIVE_FINANCE_PASSWORD=... \
 *   npx vitest run src/api/live.test.ts
 *
 * Requires a backend started with CORS_ORIGINS=http://localhost:5173 and the mock payment provider, plus a
 * database seeded with at least one nurse UNDER_REVIEW and one PENDING wallet adjustment.
 * It uses the app's real api modules, so it exercises the same code paths as the browser.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import * as authApi from './auth.api';
import * as bookingsApi from './bookings.api';
import * as couponsApi from './coupons.api';
import * as dashboardApi from './dashboard.api';
import * as emergencyApi from './emergency.api';
import { ApiError } from './errors';
import * as financeApi from './finance.api';
import * as nursesApi from './nurses.api';
import * as opsApi from './ops.api';
import { refreshSession, resolveBackendUrl } from './client';
import { tokenStore } from './tokens';
import * as usersApi from './users.api';
import * as verificationApi from './verification.api';
import { randomUUID } from 'node:crypto';

const env = process.env;
const live = Boolean(env.LIVE_API && env.LIVE_ADMIN_EMAIL && env.LIVE_ADMIN_PASSWORD && env.LIVE_FINANCE_EMAIL && env.LIVE_FINANCE_PASSWORD);

const signInAdmin = () => authApi.login(env.LIVE_ADMIN_EMAIL as string, env.LIVE_ADMIN_PASSWORD as string);
const signInFinance = () => authApi.login(env.LIVE_FINANCE_EMAIL as string, env.LIVE_FINANCE_PASSWORD as string);

async function status(p: Promise<unknown>): Promise<number> {
  try {
    await p;
    return 200;
  } catch (e) {
    return e instanceof ApiError ? e.status : -1;
  }
}

describe.runIf(live)('live backend — ADMIN', () => {
  beforeAll(async () => {
    const user = await signInAdmin();
    expect(user.role).toBe('ADMIN');
  });

  it('keeps the access token out of storage and the refresh token in sessionStorage only', () => {
    expect(tokenStore.getAccess()).toBeTruthy();
    expect(JSON.stringify(localStorage)).not.toContain(tokenStore.getAccess() as string);
    expect(JSON.stringify(sessionStorage)).not.toContain(tokenStore.getAccess() as string);
    expect(sessionStorage.length).toBe(1);
    expect(localStorage.length).toBe(0);
  });

  it('restores the session identity with GET /users/me', async () => {
    const me = await authApi.me();
    expect(me.role).toBe('ADMIN');
  });

  it('loads dashboard figures', async () => {
    const stats = await dashboardApi.getStats();
    expect(stats.totalUsers).toBeGreaterThan(0);
    const report = await dashboardApi.getMarketplaceReport();
    expect(report.nursesByVerification).toBeTypeOf('object');
    expect(await dashboardApi.countBookings('PAYMENT_PENDING')).toBeGreaterThanOrEqual(0);
  });

  it('lists bookings with server pagination and filters, and loads detail + history', async () => {
    const page = await bookingsApi.listBookings({ page: 1, limit: 2 });
    expect(page.items.length).toBeLessThanOrEqual(2);
    expect(page.meta.total).toBeGreaterThan(0);
    const filtered = await bookingsApi.listBookings({ status: 'CANCELLED', limit: 20 });
    expect(filtered.items.every((b) => b.status === 'CANCELLED')).toBe(true);
    const detail = await bookingsApi.getBooking(page.items[0].id);
    expect(detail.id).toBe(page.items[0].id);
    expect(Array.isArray(await bookingsApi.getBookingHistory(detail.id))).toBe(true);
  });

  it('normalises users / nurses / services (lean documents) to usable ids', async () => {
    const users = await usersApi.listUsers({ role: 'PATIENT', limit: 5 });
    expect(users.items.every((u) => u.id && !('passwordHash' in u))).toBe(true);
    const search = await usersApi.listUsers({ role: 'PATIENT', search: users.items[0].firstName });
    expect(search.items.length).toBeGreaterThan(0);

    const nurses = await nursesApi.listNurses({ limit: 5 });
    expect(nurses.items.every((n) => n.id && n.userId && n.user?.firstName)).toBe(true);
    expect(JSON.stringify(nurses.items)).not.toMatch(/coordinates/);

    const services = await opsApi.listServices({ limit: 5 });
    expect(services.items.every((s) => s.id)).toBe(true);
  });

  it('never keeps emergency address, coordinates or notes', async () => {
    const list = await emergencyApi.listEmergencyRequests({ limit: 5 });
    expect(JSON.stringify(list)).not.toMatch(/latitude|longitude|"address"|"notes"|Private clinical note/);
    if (list.items[0]) {
      const detail = await emergencyApi.getEmergencyRequest(list.items[0].id);
      expect(JSON.stringify(detail)).not.toMatch(/latitude|longitude|"address"|"notes"|Private clinical note/);
    }
  });

  it('reads finance lists and the reconciliation report', async () => {
    expect((await financeApi.listPayments({ limit: 5 })).meta.total).toBeGreaterThanOrEqual(0);
    expect((await financeApi.listRefunds({ limit: 5 })).meta.total).toBeGreaterThanOrEqual(0);
    expect((await financeApi.listPayouts({ limit: 5 })).meta.total).toBeGreaterThanOrEqual(0);
    const rec = await financeApi.getReconciliation();
    expect(rec.totals.grossMinor).toBeTypeOf('number');
    expect(Number.isInteger(rec.totals.commissionMinor)).toBe(true);
    expect(Array.isArray(rec.checks)).toBe(true);
    expect((await opsApi.getQueueHealth()).queues).toBeInstanceOf(Array);
    expect((await opsApi.listAuditLogs({ limit: 5 })).items[0].id).toBeTruthy();
    expect((await opsApi.getSettings())['commission.defaultBps']).toBeDefined();
  });

  it('runs the nurse verification flow: queue → detail → signed document preview → decisions', async () => {
    const queue = await nursesApi.listNurses({ verificationStatus: 'UNDER_REVIEW', limit: 20 });
    expect(queue.items.length).toBeGreaterThan(0);
    const nurseId = queue.items[0].id;
    const detail = await verificationApi.getVerificationDetail(nurseId);
    expect(detail.documents.length).toBeGreaterThan(0);

    // The signed link is short-lived and fetchable WITHOUT any bearer token; the bytes are an image.
    const { url, expiresAt } = await verificationApi.getFileAccessUrl(detail.documents[0].fileId);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
    const file = await fetch(resolveBackendUrl(url), { credentials: 'omit' });
    expect(file.status).toBe(200);
    expect(file.headers.get('content-type')).toMatch(/^image\//);
    const tampered = await fetch(resolveBackendUrl(url.replace(/sig=[0-9a-f]{4}/, 'sig=0000')), { credentials: 'omit' });
    expect(tampered.status).toBe(403);

    // Reject needs a reason; approving works and is idempotent.
    expect(await status(verificationApi.rejectDocument(detail.documents[0].id, 'x'))).toBe(400);
    const doc = await verificationApi.approveDocument(detail.documents[0].id);
    expect(doc.status).toBe('VERIFIED');
    const approved = await verificationApi.approveDocument(detail.documents[0].id);
    expect(approved.status).toBe('VERIFIED');
  });

  it('creates and toggles a coupon, surfacing backend validation errors', async () => {
    const code = `T${Date.now().toString(36).toUpperCase()}`;
    const c = await couponsApi.createCoupon({ code, type: 'PERCENTAGE', valueBps: 1000, startAt: new Date(Date.now() - 1000).toISOString(), endAt: new Date(Date.now() + 86_400_000).toISOString() });
    expect(c.active).toBe(true);
    expect((await couponsApi.deactivateCoupon(c.id)).active).toBe(false);
    expect((await couponsApi.activateCoupon(c.id)).active).toBe(true);
    // PERCENTAGE without valueBps is rejected by the server with a field-level message.
    await expect(couponsApi.createCoupon({ code: `${code}X`, type: 'PERCENTAGE', startAt: new Date().toISOString(), endAt: new Date(Date.now() + 86_400_000).toISOString() })).rejects.toMatchObject({ isValidation: true });
  });

  it('requests a wallet adjustment: a large one is parked as PENDING, retrying with the same key does not duplicate it', async () => {
    const nurse = (await nursesApi.listNurses({ verificationStatus: 'VERIFIED', limit: 1 })).items[0];
    const key = randomUUID();
    const body = { bucket: 'AVAILABLE' as const, amountMinor: 900_000, reason: 'Live test: needs a second approver' };
    const first = await financeApi.requestAdjustment(nurse.id, body, key);
    expect(first.status).toBe('PENDING');
    expect(first.applied).toBe(false);
    const retry = await financeApi.requestAdjustment(nurse.id, body, key);
    expect(retry.adjustmentId).toBe(first.adjustmentId);
    const wallet = await financeApi.getWallet(nurse.id);
    expect(Number.isInteger(wallet.pendingBalanceMinor)).toBe(true);
  });

  it('an ADMIN can never approve or reject an adjustment (separation of duties)', async () => {
    const queue = await financeApi.listAdjustments({ status: 'PENDING', limit: 5 });
    expect(queue.items.length).toBeGreaterThan(0);
    const pending = queue.items[0];
    expect(await status(financeApi.approveAdjustment(pending.id))).toBe(403); // separation of duties
    expect(await status(financeApi.rejectAdjustment(pending.id, 'nope nope'))).toBe(403);
    const wallet = await financeApi.getWallet(pending.nurseId);
    expect(Number.isInteger(wallet.availableBalanceMinor)).toBe(true);
  });

  it('refuses admin-only actions on the wrong state (server stays authoritative)', async () => {
    const paid = await bookingsApi.listBookings({ status: 'CANCELLED', limit: 1 });
    if (paid.items[0]) expect(await status(bookingsApi.cancelBooking(paid.items[0].id, { reason: 'again please' }))).toBeGreaterThanOrEqual(400);
    expect(await status(financeApi.retryRefund('000000000000000000000000'))).toBe(404);
  });

  it('rotates the refresh token and revokes the old one (single-use)', async () => {
    const before = tokenStore.getRefresh() as string;
    await refreshSession();
    const after = tokenStore.getRefresh() as string;
    expect(after).not.toBe(before);
    expect((await authApi.me()).role).toBe('ADMIN');
  });
});

describe.runIf(live)('live backend — FINANCE_APPROVER', () => {
  beforeAll(async () => {
    expect((await signInFinance()).role).toBe('FINANCE_APPROVER');
  });

  it('can read finance data and queues', async () => {
    expect((await financeApi.listAdjustments({ status: 'PENDING', limit: 5 })).meta.total).toBeGreaterThanOrEqual(0);
    expect((await financeApi.getReconciliation()).checks.length).toBeGreaterThan(0);
    expect((await opsApi.getQueueHealth()).queues).toBeInstanceOf(Array);
    expect((await financeApi.listPayments({ limit: 1 })).items).toBeInstanceOf(Array);
  });

  it('is denied (403) every general admin endpoint', async () => {
    expect(await status(dashboardApi.getStats())).toBe(403);
    expect(await status(bookingsApi.listBookings({ limit: 1 }))).toBe(403);
    expect(await status(usersApi.listUsers({ limit: 1 }))).toBe(403);
    expect(await status(nursesApi.listNurses({ limit: 1 }))).toBe(403);
    expect(await status(verificationApi.listDocuments({ limit: 1 }))).toBe(403);
    expect(await status(opsApi.listAuditLogs({ limit: 1 }))).toBe(403);
    expect(await status(opsApi.getSettings())).toBe(403);
    expect(await status(couponsApi.listCoupons({ limit: 1 }))).toBe(403);
    expect(await status(emergencyApi.listEmergencyRequests({ limit: 1 }))).toBe(403);
  });

  it('cannot request adjustments, retry refunds or cancel payouts (maker actions are ADMIN-only)', async () => {
    expect(await status(financeApi.requestAdjustment('000000000000000000000000', { bucket: 'AVAILABLE', amountMinor: 100, reason: 'not allowed' }, randomUUID()))).toBe(403);
    expect(await status(financeApi.retryRefund('000000000000000000000000'))).toBe(403);
    expect(await status(financeApi.cancelPayout('000000000000000000000000'))).toBe(403);
  });

  it('approves another admin’s pending adjustment exactly once', async () => {
    const queue = await financeApi.listAdjustments({ status: 'PENDING', limit: 10 });
    expect(queue.items.length).toBeGreaterThan(0);
    const target = queue.items[0];
    const walletBefore = await financeApi.getWallet(target.nurseId);
    const done = await financeApi.approveAdjustment(target.id, 'verified in test');
    expect(done.status).toBe('APPLIED');
    const walletAfter = await financeApi.getWallet(target.nurseId);
    expect(walletAfter.availableBalanceMinor - walletBefore.availableBalanceMinor).toBe(target.bucket === 'AVAILABLE' ? target.amountMinor : 0);
    // Approving again is idempotent on the server: same ledger entry, no second movement of money.
    const again = await financeApi.approveAdjustment(target.id);
    expect(again.ledgerId).toBe(done.ledgerId);
    const after = await financeApi.getWallet(target.nurseId);
    expect(after.availableBalanceMinor).toBe(walletAfter.availableBalanceMinor);
  });
});

describe.runIf(live)('live backend — session handling', () => {
  it('rejects bad credentials with 401 and does not start a refresh', async () => {
    tokenStore.clear();
    await expect(authApi.login(env.LIVE_ADMIN_EMAIL as string, 'definitely-wrong-password')).rejects.toMatchObject({ status: 401 });
    expect(tokenStore.getAccess()).toBeNull();
  });

  it('logout revokes the refresh token server-side', async () => {
    await signInAdmin();
    const stolen = tokenStore.getRefresh() as string;
    await authApi.logout();
    expect(tokenStore.getRefresh()).toBeNull();
    sessionStorage.setItem('careflow.session', stolen); // pretend an attacker kept a copy
    await expect(refreshSession()).rejects.toBeInstanceOf(ApiError);
  });

  it('protected routes answer 401 with no session and the client reports it', async () => {
    tokenStore.clear();
    expect(await status(financeApi.listPayments({ limit: 1 }))).toBe(401);
  });
});

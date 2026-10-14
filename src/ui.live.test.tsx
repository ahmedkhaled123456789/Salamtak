// @vitest-environment-options {"url": "http://localhost:5173"}
/**
 * Opt-in UI smoke test: mounts the real <App/> in jsdom against a RUNNING local backend, signs in through the
 * actual login form and visits every route. Same env vars as src/api/live.test.ts.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { tokenStore } from './api/tokens';

const env = process.env;
const live = Boolean(env.LIVE_API && env.LIVE_ADMIN_EMAIL && env.LIVE_ADMIN_PASSWORD && env.LIVE_FINANCE_EMAIL && env.LIVE_FINANCE_PASSWORD);

const go = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

async function signIn(email: string, password: string) {
  tokenStore.clear();
  go('/');
  render(<App />);
  const emailBox = await screen.findByLabelText('Email');
  fireEvent.change(emailBox, { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByRole('navigation', { name: 'Primary' }, { timeout: 15_000 });
}

const settle = () => new Promise((r) => setTimeout(r, 1500));

afterEach(() => {
  cleanup();
  tokenStore.clear();
});

const ADMIN_ROUTES = ['/', '/bookings', '/nurses', '/patients', '/services', '/emergency', '/finance/payments', '/finance/refunds', '/finance/payouts', '/finance/wallets', '/finance/approvals', '/finance/reconciliation', '/reviews', '/coupons', '/conversations', '/operations/verification', '/operations/documents', '/operations/notifications', '/reports', '/operations/queues', '/settings', '/audit-logs', '/no-such-page'];
const FINANCE_ALLOWED = ['/', '/finance/payments', '/finance/refunds', '/finance/payouts', '/finance/wallets', '/finance/approvals', '/finance/reconciliation', '/operations/notifications', '/operations/queues', '/settings'];
const FINANCE_DENIED = ['/bookings', '/nurses', '/patients', '/emergency', '/reviews', '/coupons', '/operations/verification', '/reports', '/audit-logs'];

describe.runIf(live)('UI against the live backend', () => {
  it('rejects a wrong password with a clear message and stays on the login page', async () => {
    tokenStore.clear();
    go('/');
    render(<App />);
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: env.LIVE_ADMIN_EMAIL } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Primary' })).toBeNull();
  });

  it('ADMIN: every page renders real data without error states', async () => {
    await signIn(env.LIVE_ADMIN_EMAIL as string, env.LIVE_ADMIN_PASSWORD as string);
    const problems: string[] = [];
    for (const path of ADMIN_ROUTES) {
      go(path);
      await settle();
      const text = document.body.textContent ?? '';
      if (path === '/no-such-page') {
        if (!text.includes("This page doesn't exist")) problems.push(`${path}: no 404 view`);
        continue;
      }
      if (/Something went wrong|Permission denied|You don't have access|Session expired|Can't reach the server/.test(text)) problems.push(`${path}: error state shown`);
      if (!document.querySelector('h1')) problems.push(`${path}: no page heading`);
    }
    expect(problems).toEqual([]);
  }, 120_000);

  it('ADMIN: dashboard shows real figures and no fabricated numbers', async () => {
    await signIn(env.LIVE_ADMIN_EMAIL as string, env.LIVE_ADMIN_PASSWORD as string);
    go('/');
    await settle();
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/Gross Booking Value/);
    expect(text).toMatch(/Trends aren't available yet/); // honest gap, not a fake chart
    expect(text).not.toMatch(/Demo data|12\.8% take rate|Ahmed Al Mansoori|4\.86/);
  }, 60_000);

  it('FINANCE_APPROVER: finance pages work, general admin pages are denied, nav hides them', async () => {
    await signIn(env.LIVE_FINANCE_EMAIL as string, env.LIVE_FINANCE_PASSWORD as string);
    go('/settings');
    await waitFor(() => expect(document.body.textContent).toContain('Finance Approver'), { timeout: 5000 });
    go('/');
    const nav = screen.getByRole('navigation', { name: 'Primary' }).textContent ?? '';
    for (const hidden of ['Bookings', 'Nurses', 'Patients', 'Coupons', 'Audit Logs', 'Nurse Verification']) expect(nav).not.toContain(hidden);
    for (const shown of ['Payments', 'Finance Approvals', 'Reconciliation', 'Queue Health']) expect(nav).toContain(shown);

    const problems: string[] = [];
    for (const path of FINANCE_ALLOWED) {
      go(path);
      await settle();
      const text = document.body.textContent ?? '';
      if (/Something went wrong|Permission denied|You don't have access|Session expired/.test(text)) problems.push(`${path}: unexpectedly blocked or failing`);
    }
    for (const path of FINANCE_DENIED) {
      go(path);
      await waitFor(() => expect(document.body.textContent).toContain("You don't have access to this page"), { timeout: 5000 }).catch(() => problems.push(`${path}: not denied in the UI`));
    }
    expect(problems).toEqual([]);
  }, 180_000);

  it('FINANCE_APPROVER sees Approve/Reject controls on others’ requests; ADMIN does not', async () => {
    await signIn(env.LIVE_FINANCE_EMAIL as string, env.LIVE_FINANCE_PASSWORD as string);
    go('/finance/approvals');
    await settle();
    const hasApprove = (document.body.textContent ?? '').includes('Approve');
    cleanup();
    await signIn(env.LIVE_ADMIN_EMAIL as string, env.LIVE_ADMIN_PASSWORD as string);
    go('/finance/approvals');
    await settle();
    expect(document.body.textContent).not.toMatch(/\bApprove\b(?! this)/);
    expect(hasApprove).toBe(true);
  }, 90_000);
});

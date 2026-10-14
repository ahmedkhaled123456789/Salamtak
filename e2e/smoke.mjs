/**
 * Browser smoke test (opt-in). Drives the REAL installed Chrome against a running local stack:
 *
 *   dashboard : http://localhost:5173   (npm run dev)
 *   backend   : proxied by Vite, local disposable DB only
 *
 *   E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… E2E_FINANCE_EMAIL=… E2E_FINANCE_PASSWORD=… \
 *   [E2E_BASE=http://localhost:5173] [E2E_SHOTS=./e2e-shots] node e2e/smoke.mjs
 *
 * Requires E2E_CONFIRM_DISPOSABLE=1 (see e2e/seed.mjs: it writes data, so it only targets a local disposable database).
 * Exit code 1 if any check fails. Never point this at production data.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { seedE2E } from './seed.mjs';

const BASE = process.env.E2E_BASE || 'http://localhost:5173';
const SHOTS = process.env.E2E_SHOTS || './e2e-shots';
const need = ['E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD', 'E2E_FINANCE_EMAIL', 'E2E_FINANCE_PASSWORD'];
if (need.some((k) => !process.env[k])) {
  console.error(`Set ${need.join(', ')}`);
  process.exit(2);
}
mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : `  -> ${detail}`}`);
};

// Disposable data created through the public API with a fresh tag each run, so the suite is repeatable.
const seed = await seedE2E({ apiBase: `${BASE}/api/v1`, adminEmail: process.env.E2E_ADMIN_EMAIL, adminPassword: process.env.E2E_ADMIN_PASSWORD });
console.log(`INFO  seeded disposable data, tag ${seed.tag}`);

const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function newSession(viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedApi = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('response', (r) => {
    if (r.url().includes('/api/v1/') && r.status() >= 400) failedApi.push(`${r.status()} ${new URL(r.url()).pathname}`);
  });
  return { context, page, consoleErrors, failedApi };
}

async function login(page, email, password) {
  await page.goto(`${BASE}/`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('navigation', { name: 'Primary' }).waitFor({ timeout: 15000 });
}

/** Waits (unlike Locator.isVisible, which does not) for an element to become visible. */
const vis = (locator, ms = 8000) => locator.waitFor({ state: 'visible', timeout: ms }).then(() => true).catch(() => false);

const settle = (page) => page.waitForLoadState('networkidle').catch(() => undefined).then(() => page.waitForTimeout(400));

/* ------------------------------------------------------------------ ADMIN */
{
  const { context, page, consoleErrors, failedApi } = await newSession();

  // login screen, wrong password
  await page.goto(`${BASE}/bookings`);
  check('unauthenticated deep link redirects to /login', new URL(page.url()).pathname === '/login');
  await page.screenshot({ path: `${SHOTS}/01-login.png` });
  await page.getByLabel('Email').fill(process.env.E2E_ADMIN_EMAIL);
  await page.getByLabel('Password').fill('wrong-password-123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  check('wrong password shows a clear error', await vis(page.getByText('Incorrect email or password.'), 8000));

  // real login, return to the deep link
  await page.getByLabel('Password').fill(process.env.E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('navigation', { name: 'Primary' }).waitFor({ timeout: 15000 });
  check('after login the original deep link (/bookings) is restored', new URL(page.url()).pathname === '/bookings');

  // token storage
  const store = await page.evaluate(() => ({
    local: Object.entries(localStorage),
    session: Object.entries(sessionStorage),
    cookie: document.cookie
  }));
  const jwtLike = (v) => /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(v);
  check('no JWT access token in localStorage/sessionStorage/cookies', ![...store.local, ...store.session].some(([, v]) => jwtLike(v) || /eyJ[\w-]{20,}\./.test(v)) && !/eyJ/.test(store.cookie));
  check('localStorage holds only UI preferences (no tokens)', store.local.every(([k]) => /sidebar|theme/i.test(k)), JSON.stringify(store.local.map(([k]) => k)));
  check('sessionStorage holds exactly the refresh token', store.session.length === 1);

  // reload -> session restore
  await page.reload();
  await page.getByRole('navigation', { name: 'Primary' }).waitFor({ timeout: 15000 });
  check('reload restores the session (no login flash)', new URL(page.url()).pathname === '/bookings');

  // dashboard + screenshots (light)
  await page.goto(`${BASE}/`);
  await settle(page);
  await page.screenshot({ path: `${SHOTS}/02-dashboard-light.png`, fullPage: true });
  const dash = await page.locator('main').innerText();
  check('dashboard shows real finance totals and an honest "unavailable" panel', /Gross Booking Value/.test(dash) && /aren't available yet/.test(dash));
  check('dashboard has no demo artefacts', !/Demo data|Ahmed Al Mansoori|12\.8% take rate/.test(dash));

  // dark mode
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.waitForTimeout(300);
  check('dark mode toggles the root class', await page.evaluate(() => document.documentElement.classList.contains('dark')));
  await page.screenshot({ path: `${SHOTS}/03-dashboard-dark.png`, fullPage: true });
  await page.reload();
  await page.getByRole('navigation', { name: 'Primary' }).waitFor();
  check('theme preference persists across reload', await page.evaluate(() => document.documentElement.classList.contains('dark')));
  await page.getByRole('button', { name: 'Switch to light theme' }).click();

  // representative pages
  for (const [path, shot] of [['/bookings', '04-bookings'], ['/nurses', '05-nurses'], ['/operations/verification', '06-verification'], ['/finance/approvals', '07-approvals'], ['/finance/reconciliation', '08-reconciliation'], ['/emergency', '09-emergency'], ['/operations/queues', '10-queues']]) {
    await page.goto(`${BASE}${path}`);
    await settle(page);
    await page.screenshot({ path: `${SHOTS}/${shot}.png`, fullPage: true });
    const text = await page.locator('main').innerText();
    check(`${path} renders without an error state`, !/Something went wrong|Permission denied|Session expired|Can't reach the server/.test(text));
  }

  // emergency privacy (data seeded with an address + a private note)
  await page.goto(`${BASE}/emergency`);
  await settle(page);
  const firstRow = page.locator('main ul li button').first();
  check('seeded emergency request is listed', seed.emergencyCreated && (await firstRow.count()) > 0);
  if (await firstRow.count()) await firstRow.click();
  await settle(page);
  // prove the privacy check below examined the SEEDED request (its detail shows the seeded patient's name)
  check('emergency detail is the seeded request', await vis(page.getByText(`Pat${seed.tag}`), 10000));
  const emergencyText = await page.locator('main').innerText();
  check('emergency view never shows the private note or street address', !/Private clinical note|Marina Walk/.test(emergencyText));

  // booking drawer
  await page.goto(`${BASE}/bookings`);
  await settle(page);
  const seededRow = page.locator('tbody tr', { hasText: seed.bookingNumber });
  check('seeded booking is listed', (await seededRow.count()) === 1);
  await seededRow.click();
  await page.getByText('Status history').waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${SHOTS}/11-booking-drawer.png` });
  const drawer = await page.locator('[class*="fixed"]').last().innerText();
  check('booking drawer hides street address', !/Marina Walk/.test(drawer));
  await page.keyboard.press('Escape');

  // server-side status filter: every visible row must have the chosen status (or the empty state shows)
  for (const tab of ['Confirmed', 'Cancelled', 'Disputed']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await settle(page);
    const statuses = await page.locator('tbody tr td:last-child').allInnerTexts();
    const empty = /No bookings match these filters/.test(await page.locator('main').innerText());
    if (tab === 'Confirmed') check('seeded booking appears under Confirmed', (await page.locator('tbody').innerText()).includes(seed.bookingNumber));
    check(`status tab "${tab}" filters server-side (${statuses.length} rows)`, empty ? statuses.length === 0 : statuses.length > 0 && statuses.every((t) => t.trim().toLowerCase() === tab.toLowerCase()), JSON.stringify(statuses.slice(0, 3)));
  }

  // empty state
  await page.goto(`${BASE}/reviews`);
  await settle(page);
  check('empty state renders for reviews', /No flagged reviews|No reviews here/.test(await page.locator('main').innerText()));

  // loading state (delay the API) then error state then retry
  await page.route('**/api/v1/admin/payments*', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto(`${BASE}/finance/payments`);
  check('loading skeleton is shown while data is in flight', await vis(page.locator('[aria-busy="true"]').first(), 3000));
  await settle(page);
  await page.unroute('**/api/v1/admin/payments*');

  await page.route('**/api/v1/admin/refunds*', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'MongoServerError: secret internals /srv/app.js', errorCode: 'INTERNAL' }) }));
  await page.goto(`${BASE}/finance/refunds`);
  await settle(page);
  const errText = await page.locator('main').innerText();
  check('500 shows a safe error state with Try again (no internals)', /Something went wrong/.test(errText) && /Try again/.test(errText) && !/MongoServerError|srv\/app/.test(errText));
  await page.screenshot({ path: `${SHOTS}/12-error-state.png` });
  await page.unroute('**/api/v1/admin/refunds*');
  await page.getByRole('button', { name: 'Try again' }).click();
  await settle(page);
  check('Try again recovers once the API is healthy', !/Something went wrong/.test(await page.locator('main').innerText()));

  // 403 from the API is "permission denied" and does NOT sign out
  await page.route('**/api/v1/admin/payouts*', (route) => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'Forbidden', errorCode: 'FORBIDDEN' }) }));
  await page.goto(`${BASE}/finance/payouts`);
  await settle(page);
  check('403 shows permission denied', /Permission denied/.test(await page.locator('main').innerText()));
  check('403 keeps the session', new URL(page.url()).pathname === '/finance/payouts' && (await page.getByRole('navigation', { name: 'Primary' }).count()) === 1);
  await page.unroute('**/api/v1/admin/payouts*');

  // mutation: create a coupon through the UI
  await page.goto(`${BASE}/coupons`);
  await settle(page);
  const code = `E2E${Date.now().toString(36).toUpperCase()}`;
  await page.getByRole('button', { name: 'Create Coupon', exact: true }).first().click();
  await page.getByLabel('Code').fill(code);
  await page.getByLabel('Percentage off').fill('12.5');
  await page.getByRole('button', { name: 'Create coupon', exact: true }).click();
  await page.getByText(`Coupon ${code} created`).waitFor({ timeout: 10000 });
  await settle(page);
  check('coupon created via UI appears in the list from the server', await page.getByText(code, { exact: true }).first().isVisible());
  // backend validation error surfaces
  await page.getByRole('button', { name: 'Create Coupon', exact: true }).first().click();
  await page.getByLabel('Code').fill('ab');
  await page.getByRole('button', { name: 'Create coupon', exact: true }).click();
  check('client-side validation message is shown', await vis(page.getByText('At least 3 characters'), 3000));
  await page.keyboard.press('Escape');

  // mutation: block + unblock a patient with confirmation
  await page.goto(`${BASE}/patients`);
  await page.getByPlaceholder('Search name, email, phone…').fill(seed.patientSearch);
  await page.waitForResponse((r) => r.url().includes('/admin/users') && r.url().includes('search='), { timeout: 10000 }).catch(() => undefined);
  await settle(page);
  check('server-side search finds exactly the seeded patient', (await page.locator('tbody tr').count()) === 1);
  const row = page.locator('tbody tr').first();
  await row.getByRole('button', { name: /Actions for/ }).click();
  await page.getByRole('menuitem', { name: 'Block account' }).click();
  const confirmBtn = page.getByRole('button', { name: 'Block account' });
  check('destructive action is disabled until a reason is typed', await confirmBtn.isDisabled());
  await page.getByPlaceholder(/audit log/).fill('E2E smoke test block');
  await confirmBtn.click();
  await page.getByText('Account blocked').waitFor({ timeout: 10000 });
  await settle(page);
  check('patient shows Blocked after the server confirms', (await page.locator('tbody tr').first().innerText()).includes('Blocked'));
  await page.locator('tbody tr').first().getByRole('button', { name: /Actions for/ }).click();
  await page.getByRole('menuitem', { name: 'Unblock account' }).click();
  await page.getByRole('button', { name: 'Unblock account' }).click();
  await page.getByText('Account unblocked').waitFor({ timeout: 10000 });
  check('patient can be unblocked again', true);

  // maker side of maker-checker: request a large wallet adjustment through the UI
  await page.goto(`${BASE}/finance/wallets`);
  await settle(page);
  await page.locator('main ul li button', { hasText: `Nora${seed.tag}` }).first().click();
  const balances = await page.getByText('Available', { exact: true }).first().waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
  check('wallet balances load for the chosen nurse', balances);
  await page.getByRole('button', { name: 'Request adjustment' }).click();
  await page.getByLabel('Amount').fill('9000');
  await page.getByLabel('Reason').fill('E2E: large goodwill credit needing a second approver');
  await page.getByRole('button', { name: 'Submit request' }).click();
  check('large adjustment is submitted for approval, not applied', await vis(page.getByText('Adjustment submitted for approval'), 10000));

  // responsive: no horizontal page scroll on phone width
  await page.setViewportSize({ width: 390, height: 844 });
  const overflowing = [];
  for (const path of ['/', '/bookings', '/nurses', '/finance/payments', '/finance/approvals', '/reviews', '/operations/queues', '/settings']) {
    await page.goto(`${BASE}${path}`);
    await settle(page);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) overflowing.push(`${path}(+${over}px)`);
    if (path === '/' || path === '/bookings') await page.screenshot({ path: `${SHOTS}/13-mobile${path === '/' ? '-dashboard' : '-bookings'}.png`, fullPage: true });
  }
  check('phone width (390px): no page-level horizontal overflow', overflowing.length === 0, overflowing.join(', '));
  await page.setViewportSize({ width: 1440, height: 900 });

  // session expiry: every API call and the refresh start failing
  await page.goto(`${BASE}/`);
  await settle(page);
  await page.route('**/api/v1/**', (route) => {
    const u = route.request().url();
    if (u.includes('/auth/login')) return route.continue();
    return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false, message: 'expired', errorCode: 'TOKEN_EXPIRED' }) });
  });
  await page.goto(`${BASE}/nurses`);
  await page.waitForURL('**/login', { timeout: 15000 }).catch(() => undefined);
  check('unrecoverable 401 sends the user to /login (no retry loop)', new URL(page.url()).pathname === '/login');
  check('session storage is cleared after expiry', (await page.evaluate(() => sessionStorage.length)) === 0);
  await page.unroute('**/api/v1/**');

  // logout
  await login(page, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Open user menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await page.waitForURL('**/login', { timeout: 10000 });
  check('logout lands on /login and clears the refresh token', (await page.evaluate(() => sessionStorage.length)) === 0);
  await page.goto(`${BASE}/finance/payments`);
  check('after logout protected routes redirect to /login', await page.waitForURL('**/login', { timeout: 8000 }).then(() => true).catch(() => false), page.url());

  const expected = (m) => /Failed to load resource/.test(m);
  const realConsole = consoleErrors.filter((m) => !expected(m));
  check('no unexpected console errors', realConsole.length === 0, realConsole.slice(0, 3).join(' | '));
  console.log('INFO  API responses >= 400 seen during the admin run (expected: deliberate 401/403/500 injections + wrong password):', [...new Set(failedApi)].join(', ') || 'none');
  await context.close();
}

/* --------------------------------------------------------- FINANCE_APPROVER */
{
  const { context, page, consoleErrors, failedApi } = await newSession();
  await login(page, process.env.E2E_FINANCE_EMAIL, process.env.E2E_FINANCE_PASSWORD);
  const nav = await page.getByRole('navigation', { name: 'Primary' }).innerText();
  check('finance approver nav hides general admin sections', !/Bookings|Nurses|Patients|Coupons|Audit Logs|Nurse Verification|Reviews/.test(nav));
  check('finance approver nav shows finance sections', /Payments/.test(nav) && /Finance Approvals/.test(nav) && /Reconciliation/.test(nav));
  await settle(page);
  await page.screenshot({ path: `${SHOTS}/14-finance-dashboard.png`, fullPage: true });
  await page.goto(`${BASE}/bookings`);
  check('typing an admin URL shows the access-denied view', await vis(page.getByText("You don't have access to this page"), 5000));
  await page.screenshot({ path: `${SHOTS}/15-denied.png` });

  await page.goto(`${BASE}/finance/approvals`);
  await settle(page);
  const approvals = await page.locator('main').innerText();
  check('finance approver sees pending requests with an Approve control', /Approve/.test(approvals) && /Awaiting approval/.test(approvals));
  const before = await page.locator('tbody tr').count();
  await page.locator('tbody tr').first().getByRole('button', { name: 'Approve', exact: true }).click();
  const dialogText = await page.getByRole('dialog').innerText();
  check('approving requires a confirmation that states the effect on the ledger', /exactly once/.test(dialogText));
  await page.getByRole('dialog').getByRole('button', { name: /^Approve/ }).click();
  await page.getByText('Adjustment approved').waitFor({ timeout: 10000 });
  await settle(page);
  check('approved request leaves the Awaiting list only after the server confirms', (await page.locator('tbody tr').count()) < before || /Nothing awaiting approval/.test(await page.locator('main').innerText()));

  const realConsole = consoleErrors.filter((m) => !/Failed to load resource/.test(m));
  check('finance run: no unexpected console errors', realConsole.length === 0, realConsole.slice(0, 3).join(' | '));
  console.log('INFO  finance run API responses >= 400:', [...new Set(failedApi)].join(', ') || 'none');
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} browser checks passed`);
process.exit(failed.length ? 1 : 0);

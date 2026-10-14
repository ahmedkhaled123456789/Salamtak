/**
 * Creates the disposable data the browser smoke test needs, through the backend's PUBLIC HTTP API only
 * (no database access). Every run uses a fresh random tag, so it can be repeated against the same local
 * backend without clashes. Requirements on the target backend: local/disposable database, PAYMENT_PROVIDER=mock
 * (uses the dev-only webhook simulator) and an ADMIN account.
 *
 * Registration is rate limited by the backend (10/hour per IP); this seeds 2 users per run.
 */
import { randomUUID } from 'node:crypto';

// 1x1 PNG; random trailing bytes make each upload unique (the backend de-duplicates identical content).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

/**
 * Safety: the seed WRITES real rows (users, bookings, payments, wallet entries). It refuses to run unless
 *  1. the API host is loopback, and
 *  2. the operator explicitly confirms the database behind it is disposable (E2E_CONFIRM_DISPOSABLE=1).
 * (A loopback Vite dev server can still proxy to a remote backend — check VITE_DEV_API_TARGET and your backend's
 * MONGODB_URI yourself; that is what the confirmation is for.)
 *
 * Persistent data left behind (the API has no delete endpoints): users `*.<TAG>@example.test`, one nurse with a
 * wallet entry, one booking + payment, one emergency request, and the shared service "E2E Home Nursing".
 * Wipe by dropping the disposable local database.
 */
function assertSafeTarget(apiBase) {
  const host = new URL(apiBase).hostname;
  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
    throw new Error(`seed refused: ${host} is not a loopback host`);
  }
  if (process.env.E2E_CONFIRM_DISPOSABLE !== '1') {
    throw new Error('seed refused: set E2E_CONFIRM_DISPOSABLE=1 to confirm the backend uses a local, disposable database');
  }
}

export async function seedE2E({ apiBase, adminEmail, adminPassword }) {
  assertSafeTarget(apiBase);
  const tag = Math.random().toString(36).slice(2, 7).toUpperCase();
  const api = async (method, path, { token, body, headers = {}, form } = {}) => {
    const init = { method, headers: { ...headers } };
    if (token) init.headers.Authorization = `Bearer ${token}`;
    if (form) init.body = form;
    else if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    const res = await fetch(apiBase + path, init);
    const json = await res.json().catch(() => null);
    return { status: res.status, json, data: json?.data };
  };
  const must = (r, label, ok = [200, 201]) => {
    if (!ok.includes(r.status)) throw new Error(`seed: ${label} failed with ${r.status} ${r.json?.errorCode ?? ''} ${String(r.json?.message ?? '').slice(0, 120)}`);
    return r.data;
  };
  const rnd = () => String(Math.floor(1e7 + Math.random() * 9e7));

  const admin = must(await api('POST', '/auth/login', { body: { email: adminEmail, password: adminPassword } }), 'admin login');
  const A = admin.tokens.accessToken;

  // one service (reused across runs)
  const serviceName = 'E2E Home Nursing';
  let created = await api('POST', '/admin/services', { token: A, body: { name: serviceName, billingUnit: 'HOURLY', minDurationMinutes: 60, maxDurationMinutes: 1440, category: 'NURSING' } });
  let serviceId;
  if (created.status === 409) {
    const list = must(await api('GET', '/admin/services?limit=100', { token: A }), 'list services');
    const found = list.items.find((s) => s.name === serviceName);
    serviceId = String(found.id ?? found._id);
  } else {
    serviceId = must(created, 'create service').id;
    must(await api('POST', `/admin/services/${serviceId}/prices`, { token: A, body: { kind: 'HOURLY', amountMinor: 4000 } }), 'service price');
  }

  const register = async (role, first, last) => {
    const r = must(await api('POST', '/auth/register', { body: { firstName: first, lastName: last, email: `${first}.${last}.${tag}@example.test`.toLowerCase(), phone: `+9715${rnd()}`, password: 'Passw0rd-E2E-1', role } }), `register ${role}`);
    return { token: r.tokens.accessToken, id: r.user.id };
  };

  // a verified nurse who can take bookings
  const nurse = await register('NURSE', `Nora${tag}`, 'Seed');
  must(await api('PATCH', '/nurses/me', { token: nurse.token, body: { gender: 'FEMALE', yearsOfExperience: 6, location: { latitude: 25.2, longitude: 55.27 }, serviceRadiusKm: 30, specializations: ['elderly care'], languages: ['english'], city: 'Dubai' } }), 'nurse profile');
  const profileId = must(await api('GET', '/nurses/me', { token: nurse.token }), 'nurse me').id;
  must(await api('PATCH', `/admin/nurses/${profileId}/verify`, { token: A, body: { decision: 'VERIFIED' } }), 'verify nurse');
  must(await api('PUT', '/nurses/me/services', { token: nurse.token, body: { services: [{ serviceId }] } }), 'nurse services');
  for (let d = 1; d <= 7; d++) must(await api('POST', '/nurses/me/availability', { token: nurse.token, body: { kind: 'WEEKLY', dayOfWeek: d, startTime: '00:00', endTime: '24:00' } }), 'availability', [201]);
  // creates the nurse's wallet (small amounts apply immediately)
  must(await api('POST', `/admin/wallets/${profileId}/adjustments`, { token: A, headers: { 'Idempotency-Key': randomUUID() }, body: { bucket: 'AVAILABLE', amountMinor: 500, reason: `E2E ${tag} seed credit` } }), 'seed wallet', [200, 201]);

  // a patient with a paid, accepted booking and an emergency request carrying private details
  const patientFirst = `Pat${tag}`;
  const patient = await register('PATIENT', patientFirst, 'Seed');
  const LOC = { latitude: 25.2048, longitude: 55.2708, address: 'Marina Walk, Tower 1', city: 'Dubai' };
  const start = new Date(Date.now() + (7 + Math.floor(Math.random() * 20)) * 86_400_000);
  start.setUTCHours(6, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 3_600_000);
  const quote = must(await api('POST', '/bookings/quote', { token: patient.token, body: { serviceId, nurseId: profileId, startDateTime: start.toISOString(), endDateTime: end.toISOString(), location: { latitude: LOC.latitude, longitude: LOC.longitude } } }), 'quote');
  const booking = must(await api('POST', '/bookings', { token: patient.token, headers: { 'Idempotency-Key': randomUUID() }, body: { serviceId, nurseId: profileId, startDateTime: start.toISOString(), endDateTime: end.toISOString(), location: LOC, notes: 'Private clinical note that must not appear in the dashboard', quoteToken: quote.quoteToken } }), 'book');
  const payment = must(await api('POST', '/payments/create', { token: patient.token, body: { bookingId: booking.id } }), 'create payment');
  must(await api('POST', '/payments/dev/simulate', { token: A, body: { providerTransactionId: String(payment.clientSecret).split('_secret_')[0], outcome: 'succeeded' } }), 'simulate payment (needs the mock payment provider)');
  must(await api('POST', `/bookings/${booking.id}/accept`, { token: nurse.token }), 'accept booking');
  const emergency = await api('POST', '/emergency-requests', { token: patient.token, headers: { 'Idempotency-Key': randomUUID() }, body: { serviceId, durationMinutes: 120, location: LOC, notes: 'Private clinical note that must not appear in the dashboard' } });

  return { tag, patientFirst, patientSearch: patientFirst, bookingNumber: booking.bookingNumber, emergencyCreated: emergency.status === 201 };
}

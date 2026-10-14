import { describe, expect, it } from 'vitest';
import { toAdminUser, toBooking, toEmergencyRequest, toNurseProfile } from './normalize';

describe('normalizers', () => {
  it('drops exact address, coordinates and clinical notes from emergency requests', () => {
    const r = toEmergencyRequest({
      id: 'e1',
      status: 'MATCHING',
      serviceId: 's1',
      patientId: 'p1',
      requestedStart: '2026-10-09T10:00:00Z',
      durationMinutes: 120,
      expiresAt: '2026-10-09T10:30:00Z',
      offersMade: 1,
      createdAt: '2026-10-09T09:00:00Z',
      notes: 'Patient has chest pain and takes warfarin',
      location: { latitude: 25.2, longitude: 55.27, address: 'Villa 12, Palm Jumeirah', city: 'Dubai' }
    });
    const json = JSON.stringify(r);
    expect(r.location).toEqual({ city: 'Dubai' });
    expect(json).not.toMatch(/warfarin|chest pain|Palm Jumeirah|25\.2|55\.27|notes/);
  });

  it('resolves _id and the populated user on admin nurse rows, and discards GPS', () => {
    const n = toNurseProfile({
      _id: 'n1',
      userId: { _id: 'u1', firstName: 'Amira', lastName: 'H', email: 'a@x.test', phone: '+971500000000', isActive: true },
      location: { type: 'Point', coordinates: [55.27, 25.2] },
      verificationStatus: 'UNDER_REVIEW'
    });
    expect(n.id).toBe('n1');
    expect(n.userId).toBe('u1');
    expect(n.user?.firstName).toBe('Amira');
    expect(JSON.stringify(n)).not.toMatch(/coordinates/);
  });

  it('maps lean user documents to ids and never carries a password hash', () => {
    const u = toAdminUser({ _id: 'u9', email: 'x@y.test', passwordHash: 'secret-hash', role: 'PATIENT' });
    expect(u.id).toBe('u9');
    expect(JSON.stringify(u)).not.toMatch(/secret-hash|passwordHash/);
  });

  it('drops notes, exact address, GPS and internal financial snapshots from bookings', () => {
    const b = toBooking({
      id: 'b1',
      bookingNumber: 'BK-1',
      status: 'CONFIRMED',
      notes: 'Patient is diabetic and allergic to penicillin',
      location: { latitude: 25.2, longitude: 55.27, address: 'Villa 12, Palm Jumeirah', city: 'Dubai', country: 'AE' },
      financial: { commissionMinor: 600 },
      commission: { bps: 1500 },
      cancellationBreakdown: { platformKeptMinor: 1 },
      pricing: { patientPayableMinor: 8000 }
    });
    expect(b.location).toEqual({ city: 'Dubai', country: 'AE' });
    expect(b.pricing?.patientPayableMinor).toBe(8000);
    expect(JSON.stringify(b)).not.toMatch(/diabetic|penicillin|Palm Jumeirah|25\.2|55\.27|commissionMinor|platformKeptMinor/);
  });
});

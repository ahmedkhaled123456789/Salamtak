import type { AdminUser, AuditEntry, Booking, EmergencyRequest, NurseProfile } from './types';

type Raw = Record<string, unknown>;

/**
 * Some admin list endpoints (users, nurses, audit logs) return lean Mongo documents (`_id`) instead of the
 * `id`-based DTOs documented in the OpenAPI spec. Resolve the id in exactly one place.
 */
export function idOf(doc: Raw | null | undefined): string {
  if (!doc) return '';
  const id = doc.id ?? doc._id;
  return id === undefined || id === null ? '' : String(id);
}

const str = (v: unknown): string | null => (v === undefined || v === null ? null : String(v));

export function toAdminUser(raw: Raw): AdminUser {
  const { _id, id, passwordHash: _passwordHash, ...rest } = raw;
  void _passwordHash;
  return { ...(rest as unknown as AdminUser), id: String(id ?? _id) };
}

/** Admin nurse list: `userId` is populated with the account's name/contact; the single-nurse DTO has it as a string. */
export function toNurseProfile(raw: Raw): NurseProfile {
  const { _id, id, userId, location: _location, ...rest } = raw;
  void _location; // exact coordinates are not needed by the dashboard
  const populated = userId && typeof userId === 'object' ? (userId as Raw) : null;
  return {
    ...(rest as unknown as NurseProfile),
    id: String(id ?? _id),
    userId: populated ? idOf(populated) : String(userId ?? ''),
    user: populated
      ? {
          id: idOf(populated),
          firstName: String(populated.firstName ?? ''),
          lastName: String(populated.lastName ?? ''),
          email: str(populated.email) ?? undefined,
          phone: str(populated.phone) ?? undefined,
          isActive: typeof populated.isActive === 'boolean' ? populated.isActive : undefined,
          // public photo (same URL scheme as the backend's mediaUrl)
          photoUrl: populated.profileImage ? `/api/v1/media/${String(populated.profileImage)}` : undefined,
        }
      : undefined,
  };
}

export function toAuditEntry(raw: Raw): AuditEntry {
  return {
    id: idOf(raw),
    actorId: str(raw.actorId),
    actorRole: str(raw.actorRole),
    action: String(raw.action ?? ''),
    entity: String(raw.entity ?? ''),
    entityId: str(raw.entityId),
    at: String(raw.at ?? ''),
    requestId: str(raw.requestId),
  };
}

/**
 * The emergency endpoints return the exact address, GPS coordinates and free-text patient notes. None of
 * that is needed to operate the queue, so it is dropped at the API boundary (never held in React state):
 * only the city is kept.
 */
export function toEmergencyRequest(raw: Raw): EmergencyRequest {
  const loc = (raw.location && typeof raw.location === 'object' ? raw.location : {}) as Raw;
  return {
    id: String(raw.id),
    status: raw.status as EmergencyRequest['status'],
    statusReason: str(raw.statusReason),
    serviceId: String(raw.serviceId ?? ''),
    patientId: String(raw.patientId ?? ''),
    acceptedNurseId: str(raw.acceptedNurseId),
    requestedStart: String(raw.requestedStart ?? ''),
    durationMinutes: Number(raw.durationMinutes ?? 0),
    genderPreference: (raw.genderPreference as EmergencyRequest['genderPreference']) ?? null,
    expiresAt: String(raw.expiresAt ?? ''),
    offersMade: Number(raw.offersMade ?? 0),
    bookingId: str(raw.bookingId),
    createdAt: String(raw.createdAt ?? ''),
    location: { city: str(loc.city) },
  };
}

/**
 * Booking responses include the patient's free-text notes, the exact street address and GPS position, and
 * internal financial snapshots. The dashboard shows none of them, so they are dropped at the API boundary:
 * only the city/country of the location is kept, and `notes`, `financial`, `commission` and
 * `cancellationBreakdown` never reach React state or the query cache.
 */
export function toBooking(raw: Raw): Booking {
  const { notes: _notes, financial: _financial, commission: _commission, cancellationBreakdown: _breakdown, location, ...rest } = raw;
  void _notes;
  void _financial;
  void _commission;
  void _breakdown;
  const loc = (location && typeof location === 'object' ? location : {}) as Raw;
  return { ...(rest as unknown as Booking), location: { city: str(loc.city), country: str(loc.country) } };
}

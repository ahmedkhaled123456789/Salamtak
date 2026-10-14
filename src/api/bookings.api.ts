import { get, post } from './client';
import type { Booking, BookingHistoryEntry, BookingListQuery, Page } from './types';
import { toBooking } from './normalize';

export async function listBookings(query: BookingListQuery): Promise<Page<Booking>> {
  const page = await get<Page<Record<string, unknown>>>('/admin/bookings', { ...query });
  return { meta: page.meta, items: page.items.map(toBooking) };
}

export const getBooking = (id: string) => get<Record<string, unknown>>(`/bookings/${id}`).then(toBooking);

export const getBookingHistory = (id: string) => get<{ items: BookingHistoryEntry[] }>(`/bookings/${id}/history`).then((r) => r.items);

/** ADMIN only. The backend decides the refund from its cancellation policy unless `refundPercent` is given. */
export const cancelBooking = (id: string, body: { reason: string; refundPercent?: number }) =>
  post<Record<string, unknown>>(`/admin/bookings/${id}/cancel`, body).then(toBooking);

/** ADMIN only, for DISPUTED bookings. */
export const resolveBooking = (id: string, body: { resolution: 'REFUND' | 'COMPLETE'; reason: string; refundPercent?: number }) =>
  post<Record<string, unknown>>(`/admin/bookings/${id}/resolve`, body).then(toBooking);

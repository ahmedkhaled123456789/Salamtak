import { get } from './client';
import type { Booking, BookingStatus, DashboardStats, DateRangeQuery, MarketplaceReport, Page } from './types';

export const getStats = (range: DateRangeQuery = {}) => get<DashboardStats>('/admin/dashboard', { ...range });

export const getMarketplaceReport = (range: DateRangeQuery = {}) => get<MarketplaceReport>('/admin/reports/marketplace', { ...range });

/**
 * Number of bookings in a status. Uses the server's own pagination total (limit=1), so no list is
 * downloaded and nothing is aggregated in the browser.
 */
export async function countBookings(status: BookingStatus): Promise<number> {
  const page = await get<Page<Booking>>('/admin/bookings', { status, limit: 1 });
  return page.meta.total;
}

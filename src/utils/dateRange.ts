import { endOfDay, startOfDay, startOfMonth, startOfQuarter, subDays, subMonths } from 'date-fns';

export interface RangeValue {
  preset: string;
  from?: string;
  to?: string;
}

/**
 * Convert the date-range picker's value into the `from` / `to` ISO timestamps the backend filters on
 * (createdAt for users/dashboard, booking creation for bookings). `all` means no date filter at all.
 */
export function rangeToQuery(range: RangeValue, now: Date = new Date()): { from?: string; to?: string } {
  const iso = (d: Date) => d.toISOString();
  switch (range.preset) {
    case 'all':
      return {};
    case 'today':
      return { from: iso(startOfDay(now)), to: iso(endOfDay(now)) };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { from: iso(startOfDay(y)), to: iso(endOfDay(y)) };
    }
    case '7d':
      return { from: iso(startOfDay(subDays(now, 6))), to: iso(endOfDay(now)) };
    case '30d':
      return { from: iso(startOfDay(subDays(now, 29))), to: iso(endOfDay(now)) };
    case 'mtd':
      return { from: iso(startOfMonth(now)), to: iso(endOfDay(now)) };
    case 'qtd':
      return { from: iso(startOfQuarter(now)), to: iso(endOfDay(now)) };
    case '12m':
      return { from: iso(startOfDay(subMonths(now, 12))), to: iso(endOfDay(now)) };
    case 'custom': {
      if (!range.from || !range.to) return {};
      const from = new Date(`${range.from}T00:00:00`);
      const to = new Date(`${range.to}T23:59:59.999`);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return {};
      return { from: iso(from), to: iso(to) };
    }
    default:
      return {};
  }
}

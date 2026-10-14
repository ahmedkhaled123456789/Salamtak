import { BadgeCheckIcon, CalendarCheckIcon, CircleCheckIcon, HandCoinsIcon, HourglassIcon, LandmarkIcon } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { MoneyValue } from '../ui/MoneyValue';
import { useBookingCount, useDashboardStats, useMarketplaceReport, useReconciliation } from '../../hooks/queries';

const UNAVAILABLE = 'Unavailable';

/**
 * All-time money totals computed by the server's reconciliation job over every paid booking. They are
 * displayed exactly as returned; there is no period comparison because the backend doesn't provide one.
 */
export function FinanceKpis() {
  const { data, isLoading, isError } = useReconciliation();
  const t = data?.totals;
  return (
    <>
      <StatCard
        variant="feature"
        className="sm:col-span-2"
        icon={LandmarkIcon}
        label="Gross Booking Value"
        loading={isLoading}
        value={isError ? <span className="text-[20px] text-ink-3">{UNAVAILABLE}</span> : t && <MoneyValue fils={t.grossMinor} />}
        hint={isError ? "Couldn't load the ledger totals" : t && `All time · ${t.bookingsPaid.toLocaleString('en-US')} paid bookings`} />

      <StatCard
        icon={HandCoinsIcon}
        label="Platform Commission"
        loading={isLoading}
        value={isError ? <span className="text-[18px] text-ink-3">{UNAVAILABLE}</span> : t && <MoneyValue fils={t.commissionMinor} />}
        hint="All time · from booking snapshots" />

      <StatCard
        icon={HandCoinsIcon}
        label="Nurse Earnings"
        loading={isLoading}
        value={isError ? <span className="text-[18px] text-ink-3">{UNAVAILABLE}</span> : t && <MoneyValue fils={t.nurseEarningMinor} />}
        hint="All time · from booking snapshots" />

    </>);

}

export function MarketplaceKpis() {
  const stats = useDashboardStats();
  const report = useMarketplaceReport();
  const confirmed = useBookingCount('CONFIRMED');
  const started = useBookingCount('CARE_STARTED');
  const inProgress = useBookingCount('CARE_IN_PROGRESS');
  const completed = useBookingCount('COMPLETED');

  const activeLoading = confirmed.isLoading || started.isLoading || inProgress.isLoading;
  const activeError = confirmed.isError || started.isError || inProgress.isError;
  // A sum of three server-side counts (confirmed + care started + care in progress); no money involved.
  const active = (confirmed.data ?? 0) + (started.data ?? 0) + (inProgress.data ?? 0);
  const awaitingReview = report.data?.nursesByVerification.UNDER_REVIEW ?? 0;

  return (
    <>
      <StatCard
        icon={CalendarCheckIcon}
        label="Active Bookings"
        loading={activeLoading}
        value={activeError ? <span className="text-[18px] text-ink-3">{UNAVAILABLE}</span> : active.toLocaleString('en-US')}
        hint="Confirmed or in care" />

      <StatCard
        icon={CircleCheckIcon}
        label="Completed Bookings"
        loading={completed.isLoading}
        value={completed.isError ? <span className="text-[18px] text-ink-3">{UNAVAILABLE}</span> : completed.data?.toLocaleString('en-US')}
        hint="All time" />

      <StatCard
        icon={BadgeCheckIcon}
        label="Verified Nurses"
        loading={stats.isLoading}
        value={stats.isError ? <span className="text-[18px] text-ink-3">{UNAVAILABLE}</span> : stats.data?.verifiedNurses.toLocaleString('en-US')}
        hint={stats.data && `of ${stats.data.totalNurses.toLocaleString('en-US')} registered nurses`} />

      <StatCard
        variant="attention"
        icon={HourglassIcon}
        label="Awaiting Verification"
        loading={report.isLoading}
        value={report.isError ? <span className="text-[18px] text-ink-3">{UNAVAILABLE}</span> : awaitingReview}
        hint={report.data && `${report.data.documentsPendingReview} document${report.data.documentsPendingReview === 1 ? '' : 's'} waiting for review`}
        action={{ label: 'Review queue', to: '/operations/verification' }} />

    </>);

}

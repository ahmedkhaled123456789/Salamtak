import { useQuery } from '@tanstack/react-query';
import { Card } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';
import { RatingStars } from '../ui/RatingStars';
import { ErrorState } from '../ui/ErrorState';
import { listNurses } from '../../api/nurses.api';
import { useDashboardStats, useMarketplaceReport } from '../../hooks/queries';

const OPEN_EMERGENCY = ['PENDING', 'MATCHING', 'NURSE_OFFERED'];

/** Operational signals taken directly from backend counts. Success/cancellation rates aren't provided, so they aren't shown. */
export function MarketplaceHealthStrip() {
  const stats = useDashboardStats();
  const report = useMarketplaceReport();
  const bookable = useQuery({ queryKey: ['dashboard', 'bookable-nurses'], queryFn: async () => (await listNurses({ isBookable: true, limit: 1 })).meta.total });

  const isError = stats.isError && report.isError && bookable.isError;
  const by = report.data?.reviewsByStatus ?? {};
  const openEmergency = OPEN_EMERGENCY.reduce((n, s) => n + (report.data?.emergencyByStatus[s] ?? 0), 0);
  const avg = report.data?.averageRatingActive;

  return (
    <Card title="Marketplace Health" description="Live counts from the backend" flush>
      {isError ?
      <ErrorState compact onRetry={() => {void stats.refetch();void report.refetch();void bookable.refetch();}} description="We couldn't load marketplace health." /> :

      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-b-xl border-t border-line bg-line sm:grid-cols-2 xl:grid-cols-4 [&>*]:bg-surface">
          <MetricCard
          label="Bookable Nurses"
          loading={bookable.isLoading}
          value={bookable.data ?? '—'}
          caption={stats.data ? `of ${stats.data.verifiedNurses.toLocaleString('en-US')} verified nurses are accepting bookings` : 'Nurses currently accepting bookings'} />

          <MetricCard
          label="Open Emergencies"
          loading={report.isLoading}
          value={report.data ? openEmergency : '—'}
          status={report.data && openEmergency > 0 ? { label: 'Needs a nurse', tone: 'danger' } : undefined}
          caption="Pending, matching or offered" />

          <MetricCard
          label="Average Rating"
          loading={report.isLoading}
          value={avg != null ? avg.toFixed(2) : '—'}
          visual={avg != null ? <RatingStars rating={avg} size="md" /> : undefined}
          caption={report.data ? `${(by.ACTIVE ?? 0).toLocaleString('en-US')} published reviews` : undefined} />

          <MetricCard
          label="Reviews Excluded"
          loading={report.isLoading}
          value={report.data ? (by.FLAGGED ?? 0) + (by.HIDDEN ?? 0) : '—'}
          caption={report.data ? `${by.FLAGGED ?? 0} flagged · ${by.HIDDEN ?? 0} hidden — not in public ratings` : undefined} />

        </div>
      }
    </Card>);

}

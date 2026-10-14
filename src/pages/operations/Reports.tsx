import { useState } from 'react';
import { TrendingUpIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import type { DateRangeValue } from '../../components/ui/DateRangePicker';
import { SummaryStrip } from '../../components/ui/SummaryStrip';
import { Skeleton } from '../../components/ui/Skeleton';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Unavailable } from '../../components/ui/Unavailable';
import { useMarketplaceReport } from '../../hooks/queries';
import { formatFils } from '../../utils/money';
import { rangeToQuery } from '../../utils/dateRange';
import { titleCase } from '../../utils/people';
import type { CountMap } from '../../api/types';

function Breakdown({ title, counts, loading }: {title: string;counts?: CountMap;loading: boolean;}) {
  const entries = Object.entries(counts ?? {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((n, [, v]) => n + v, 0);
  return (
    <Card title={title} description={loading ? undefined : `${total.toLocaleString('en-US')} total`}>
      {loading ?
      <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div> :
      entries.length === 0 ?
      <p className="text-[12.5px] text-ink-3">No records in this period.</p> :

      <ul className="space-y-2.5">
          {entries.map(([key, value]) =>
        <li key={key}>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-ink-2">{titleCase(key)}</span>
                <span className="num font-medium text-ink">{value.toLocaleString('en-US')}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-subtle">
                <div className="h-full rounded-full bg-brand" style={{ width: `${total ? value / total * 100 : 0}%` }} />
              </div>
            </li>
        )}
        </ul>
      }
    </Card>);

}

/** Marketplace overview from GET /admin/reports/marketplace. No export: the backend has no export endpoint. */
export function Reports() {
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all' });
  const { data, isLoading, isError, error, refetch } = useMarketplaceReport(rangeToQuery(range));
  const c = data?.coupons;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Marketplace overview: verification, reviews, coupons, emergency requests and conversations."
        actions={<DateRangePicker value={range} onChange={setRange} align="right" size="md" />} />


      {isError ?
      <Card><ApiErrorState error={error} what="the report" onRetry={() => refetch()} /></Card> :

      <div className="space-y-5">
          <SummaryStrip
          loading={isLoading}
          items={[
          { label: 'Documents to review', value: data?.documentsPendingReview ?? '—', tone: 'warning' },
          { label: 'Avg. public rating', value: data ? data.averageRatingActive != null ? data.averageRatingActive.toFixed(2) : '—' : '—', hint: 'Published reviews only', tone: 'success' },
          { label: 'Coupon redemptions', value: c ? c.redemptionsApplied.toLocaleString('en-US') : '—', hint: c ? `${c.active} of ${c.total} coupons active` : undefined },
          { label: 'Discount granted', value: c ? formatFils(c.discountGrantedMinor, { decimals: false }) : '—' },
          { label: 'Active devices', value: data?.activeDevices ?? '—', hint: 'Registered for push' }]
          } />


          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Breakdown title="Nurses by verification" counts={data?.nursesByVerification} loading={isLoading} />
            <Breakdown title="Nurses by account status" counts={data?.nursesByStatus} loading={isLoading} />
            <Breakdown title="Documents by status" counts={data?.documentsByStatus} loading={isLoading} />
            <Breakdown title="Reviews by status" counts={data?.reviewsByStatus} loading={isLoading} />
            <Breakdown title="Emergency requests by status" counts={data?.emergencyByStatus} loading={isLoading} />
            <Breakdown title="Conversations" counts={data ? { booking: data.conversations.booking, support: data.conversations.support } : undefined} loading={isLoading} />
          </div>

          <Card>
            <Unavailable
            icon={TrendingUpIcon}
            title="Revenue, booking and payout trends aren't available yet"
            description="The backend doesn't expose time-series or per-period financial reports, and has no export endpoint, so no charts or downloads are shown here. All-time ledger totals are on the Reconciliation page." />

          </Card>
        </div>
      }
    </>);

}

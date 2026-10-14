import { format } from 'date-fns';
import { TrendingUpIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Unavailable } from '../components/ui/Unavailable';
import { FinanceKpis, MarketplaceKpis } from '../components/dashboard/KpiGrid';
import { AttentionCenter } from '../components/dashboard/AttentionCenter';
import { MarketplaceHealthStrip } from '../components/dashboard/MarketplaceHealthStrip';
import { BookingActivityCard } from '../components/dashboard/BookingActivityCard';
import { RecentBookings } from '../components/dashboard/RecentBookings';
import { RecentPayments } from '../components/dashboard/RecentPayments';
import { VerificationQueue } from '../components/dashboard/VerificationQueue';
import { EmergencyWidget } from '../components/dashboard/EmergencyWidget';
import { FinanceApprovalsCard } from '../components/dashboard/FinanceApprovalsCard';
import { ReviewsFeed } from '../components/dashboard/ReviewsFeed';
import { useSession } from '../contexts/SessionContext';

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Widgets render only for roles that may call their endpoints, so nobody triggers a request they'd be denied. */
export function Dashboard() {
  const { user, can } = useSession();
  const now = new Date();
  const finance = can('admin:finance:read');
  const marketplace = can('admin:dashboard') && can('admin:bookings:read');

  return (
    <>
      <PageHeader
        title={`${greeting(now)}, ${user.name.split(' ')[0]}`}
        description={marketplace ? "Here's what's happening across your marketplace." : 'Finance overview and the approvals that need your attention.'}
        meta={<span className="text-[12px] text-ink-3">{format(now, 'EEEE, MMMM d')} · {user.roleLabel}</span>} />


      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {finance && <FinanceKpis />}
          {marketplace && <MarketplaceKpis />}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <Card className="xl:col-span-8" title="Revenue Overview" description="Revenue, commission and refunds over time">
            <Unavailable
              icon={TrendingUpIcon}
              title="Trends aren't available yet"
              description="The backend provides all-time ledger totals (shown above) but no per-period revenue, commission or refund series, so no chart is drawn." />

          </Card>
          <AttentionCenter className="xl:col-span-4" />
        </div>

        {marketplace && <MarketplaceHealthStrip />}

        {marketplace &&
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <RecentBookings className="xl:col-span-8" />
            {can('admin:emergency:manage') && can('admin:reports:read') && <EmergencyWidget className="xl:col-span-4" />}
          </div>
        }

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {finance && <FinanceApprovalsCard className={can('admin:nurse-documents:review') ? 'xl:col-span-8' : 'xl:col-span-12'} />}
          {can('admin:nurse-documents:review') && can('admin:nurses:read') && <VerificationQueue className={finance ? 'xl:col-span-4' : 'xl:col-span-12'} />}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {marketplace && <BookingActivityCard className="xl:col-span-5" />}
          {finance && <RecentPayments className={marketplace ? 'xl:col-span-7' : 'xl:col-span-12'} />}
        </div>

        {can('admin:reviews:moderate') && can('admin:reports:read') && <ReviewsFeed />}
      </div>
    </>);

}

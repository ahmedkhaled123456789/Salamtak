import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CalendarPlusIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { DataTable } from '../ui/DataTable';
import { EmptyState } from '../ui/EmptyState';
import { ApiErrorState } from '../ui/ApiErrorState';
import { BookingDrawer } from '../bookings/BookingDrawer';
import { bookingColumns, renderBookingMobileRow } from '../bookings/bookingColumns';
import { useBookings } from '../../hooks/queries';

export function RecentBookings({ className }: {className?: string;}) {
  const { data, isLoading, isError, error, refetch } = useBookings({ limit: 6 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <Card
      className={className}
      title="Recent Bookings"
      description="Latest bookings across all services"
      flush
      actions={
      <Link to="/bookings" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline">
          View all bookings
          <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
        </Link>
      }>

      {isError ?
      <ApiErrorState compact error={error} what="recent bookings" onRetry={() => refetch()} /> :

      <DataTable
        columns={bookingColumns}
        rows={data?.items}
        loading={isLoading}
        getRowId={(b) => b.id}
        onRowClick={(b) => setSelectedId(b.id)}
        selectedId={selectedId}
        mobileRow={renderBookingMobileRow}
        minWidth={820}
        caption="Recent bookings"
        empty={<EmptyState compact icon={CalendarPlusIcon} title="No bookings yet" description="New bookings from patients will appear here." />} />

      }
      <BookingDrawer bookingId={selectedId} onClose={() => setSelectedId(null)} />
    </Card>);

}

import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarSearchIcon, XIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import { FilterBar } from '../../components/ui/FilterBar';
import { Select } from '../../components/ui/Select';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import type { DateRangeValue } from '../../components/ui/DateRangePicker';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Pagination } from '../../components/ui/Pagination';
import { BookingDrawer } from '../../components/bookings/BookingDrawer';
import { bookingColumns, renderBookingMobileRow } from '../../components/bookings/bookingColumns';
import { useBookings } from '../../hooks/queries';
import { useListState } from '../../hooks/useListState';
import { labelForStatus } from '../../components/ui/StatusBadge';
import { rangeToQuery } from '../../utils/dateRange';
import { BOOKING_STATUSES } from '../../api/types';
import type { BookingStatus } from '../../api/types';

const TAB_STATUSES: BookingStatus[] = ['NURSE_PENDING', 'CONFIRMED', 'CARE_IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED'];
const tabs = [{ value: 'all', label: 'All' }, ...TAB_STATUSES.map((s) => ({ value: s as string, label: labelForStatus(s) }))];
const otherStatuses = BOOKING_STATUSES.filter((s) => !TAB_STATUSES.includes(s));

export function Bookings() {
  const [params, setParams] = useSearchParams();
  const patientId = params.get('patientId') ?? undefined;
  const nurseId = params.get('nurseId') ?? undefined;
  const fromUrl = params.get('status');
  const list = useListState({ status: 'all' }, 20, fromUrl && (BOOKING_STATUSES as readonly string[]).includes(fromUrl) ? { status: fromUrl } : undefined);
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all' });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      page: list.page,
      limit: list.limit,
      status: list.filters.status === 'all' ? undefined : (list.filters.status as BookingStatus),
      patientId,
      nurseId,
      ...rangeToQuery(range)
    }),
    [list.page, list.limit, list.filters.status, patientId, nurseId, range]
  );
  const { data, isLoading, isError, error, refetch, isFetching } = useBookings(query);

  const scoped = Boolean(patientId || nurseId);
  const activeFilters = list.activeCount + (range.preset !== 'all' ? 1 : 0);
  const clear = () => {
    list.reset();
    setRange({ preset: 'all' });
  };
  const clearScope = () => {
    const next = new URLSearchParams(params);
    next.delete('patientId');
    next.delete('nurseId');
    setParams(next);
    list.setPage(1);
  };

  return (
    <>
      <PageHeader title="Bookings" description="Every booking across the marketplace — from request to visit to refund." />

      <Card flush>
        <SegmentedControl
          variant="underline"
          ariaLabel="Filter by status"
          value={list.filters.status}
          onChange={(v) => list.setFilter('status', v)}
          options={tabs} />

        <FilterBar
          activeCount={activeFilters}
          onClear={clear}
          actions={data ? <span className="num text-[12px] text-ink-3">{data.meta.total.toLocaleString('en-US')} bookings</span> : undefined}>

          <DateRangePicker
            value={range}
            onChange={(v) => {
              setRange(v);
              list.setPage(1);
            }} />

          <Select
            label="Other status"
            value={otherStatuses.includes(list.filters.status as BookingStatus) ? list.filters.status : 'all'}
            onChange={(v) => list.setFilter('status', v === 'all' ? 'all' : v)}
            options={[{ value: 'all', label: '—' }, ...otherStatuses.map((s) => ({ value: s as string, label: labelForStatus(s) }))]} />

          {scoped &&
          <button
            type="button"
            onClick={clearScope}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-brand/30 bg-brand-soft/50 px-2.5 text-[12.5px] font-medium text-brand">

              {patientId ? 'One patient' : 'One nurse'} only
              <XIcon className="h-3.5 w-3.5" aria-label="Show all bookings" />
            </button>
          }
        </FilterBar>

        {isError ?
        <ApiErrorState error={error} what="bookings" onRetry={() => refetch()} /> :

        <DataTable
          columns={bookingColumns}
          rows={data?.items}
          loading={isLoading}
          skeletonRows={8}
          getRowId={(b) => b.id}
          onRowClick={(b) => setSelectedId(b.id)}
          selectedId={selectedId}
          mobileRow={renderBookingMobileRow}
          minWidth={880}
          caption="Bookings"
          empty={
          <EmptyState
            icon={CalendarSearchIcon}
            title={activeFilters || scoped ? 'No bookings match these filters' : 'No bookings yet'}
            description={activeFilters || scoped ? 'Try a different status, widen the date range or clear the filters.' : 'When patients book a visit, it will appear here with its full status history.'}
            action={activeFilters ? <Button size="sm" onClick={clear}>Reset filters</Button> : undefined} />

          } />

        }
        {!isError && <Pagination meta={data?.meta} onPage={list.setPage} busy={isFetching} />}
      </Card>

      <BookingDrawer bookingId={selectedId} onClose={() => setSelectedId(null)} />
    </>);

}

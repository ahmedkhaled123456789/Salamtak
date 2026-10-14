import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCardIcon, XIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { FilterBar } from '../../components/ui/FilterBar';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Pagination } from '../../components/ui/Pagination';
import { PaymentDrawer } from '../../components/finance/PaymentDrawer';
import { usePayments } from '../../hooks/queries';
import { useListState } from '../../hooks/useListState';
import { formatFils } from '../../utils/money';
import { formatSmartDate } from '../../utils/date';
import { shortId, titleCase } from '../../utils/people';
import type { Payment, PaymentStatus } from '../../api/types';

const STATUSES: PaymentStatus[] = ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'];

const columns: Column<Payment>[] = [
{ key: 'ref', header: 'Reference', cell: (p) => <span className="num font-mono text-[12.5px] font-medium">{p.reference || shortId(p.id)}</span> },
{ key: 'booking', header: 'Booking', cell: (p) => <span className="num font-mono text-[12.5px] text-ink-2" title={p.bookingId}>{shortId(p.bookingId)}</span> },
{ key: 'amount', header: 'Amount', align: 'right', cell: (p) => <span className="num font-medium">{formatFils(p.amountMinor)}</span> },
{ key: 'refunded', header: 'Refunded', align: 'right', cell: (p) => <span className="num text-ink-2">{p.refundedMinor > 0 ? formatFils(p.refundedMinor) : '—'}</span> },
{ key: 'provider', header: 'Provider', cell: (p) => <span className="text-ink-2">{titleCase(p.provider)}</span> },
{ key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
{ key: 'date', header: 'Created', cell: (p) => <span className="num text-ink-3">{formatSmartDate(p.createdAt)}</span> }];


export function Payments() {
  const [params, setParams] = useSearchParams();
  const bookingId = params.get('bookingId') ?? undefined;
  const list = useListState({ status: 'all' });
  const [selected, setSelected] = useState<Payment | null>(null);

  const query = useMemo(
    () => ({ page: list.page, limit: list.limit, bookingId, status: list.filters.status === 'all' ? undefined : (list.filters.status as PaymentStatus) }),
    [list.page, list.limit, list.filters.status, bookingId]
  );
  const { data, isLoading, isError, error, refetch, isFetching } = usePayments(query);

  const clearBooking = () => {
    const next = new URLSearchParams(params);
    next.delete('bookingId');
    setParams(next);
    list.setPage(1);
  };
  const active = list.activeCount + (bookingId ? 1 : 0);

  return (
    <>
      <PageHeader title="Payments" description="Patient payments captured through the payment provider, confirmed by webhook or server-side polling." />
      <Card flush>
        <FilterBar
          className="pt-4"
          activeCount={active}
          onClear={() => {
            list.reset();
            if (bookingId) clearBooking();
          }}
          actions={data ? <span className="num text-[12px] text-ink-3">{data.meta.total.toLocaleString('en-US')} payments</span> : undefined}>

          <Select label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={[{ value: 'all', label: 'All' }, ...STATUSES.map((s) => ({ value: s, label: titleCase(s) }))]} />
          {bookingId &&
          <button
            type="button"
            onClick={clearBooking}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-brand/30 bg-brand-soft/50 px-2.5 text-[12.5px] font-medium text-brand">

              One booking only
              <XIcon className="h-3.5 w-3.5" aria-label="Show all payments" />
            </button>
          }
        </FilterBar>
        {isError ?
        <ApiErrorState error={error} what="payments" onRetry={() => refetch()} /> :

        <DataTable
          columns={columns}
          rows={data?.items}
          loading={isLoading}
          skeletonRows={8}
          getRowId={(p) => p.id}
          onRowClick={setSelected}
          selectedId={selected?.id}
          minWidth={860}
          caption="Payments"
          mobileRow={(p) =>
          <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="num font-mono text-[12.5px] font-medium text-ink">{p.reference || shortId(p.id)}</p>
                  <p className="truncate text-[12px] text-ink-3">{titleCase(p.provider)} · {formatSmartDate(p.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="num text-[13px] font-semibold">{formatFils(p.amountMinor)}</span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
          }
          empty={
          <EmptyState
            icon={CreditCardIcon}
            title={active ? 'No payments match these filters' : 'No payments yet'}
            description={active ? 'Try another status.' : 'Payments appear here once patients complete checkout.'}
            action={active ? <Button size="sm" onClick={() => {list.reset();if (bookingId) clearBooking();}}>Clear filters</Button> : undefined} />

          } />

        }
        {!isError && <Pagination meta={data?.meta} onPage={list.setPage} busy={isFetching} />}
      </Card>
      <PaymentDrawer payment={selected} onClose={() => setSelected(null)} />
    </>);

}

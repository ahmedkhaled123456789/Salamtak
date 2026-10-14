import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { RotateCwIcon, Undo2Icon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { FilterBar } from '../../components/ui/FilterBar';
import { Select } from '../../components/ui/Select';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Pagination } from '../../components/ui/Pagination';
import { useRefunds } from '../../hooks/queries';
import { useRetryRefund } from '../../hooks/mutations';
import { useListState } from '../../hooks/useListState';
import { useSession } from '../../contexts/SessionContext';
import { describeMutationError } from '../../api/errors';
import { formatFils } from '../../utils/money';
import { formatRelative, formatSmartDate } from '../../utils/date';
import { shortId, titleCase } from '../../utils/people';
import type { Refund, RefundReason, RefundStatus } from '../../api/types';

const TABS: { value: string; label: string }[] = [
{ value: 'all', label: 'All' },
{ value: 'FAILED', label: 'Failed' },
{ value: 'PENDING', label: 'Pending' },
{ value: 'PROCESSING', label: 'Processing' },
{ value: 'PROVIDER_SUCCEEDED', label: 'Provider confirmed' },
{ value: 'SUCCEEDED', label: 'Completed' }];

const REASONS: RefundReason[] = ['PATIENT_CANCELLATION', 'NURSE_REJECTED', 'NURSE_TIMEOUT', 'ADMIN_CANCELLATION', 'ADMIN_RESOLUTION', 'BOOKING_EXPIRED_BEFORE_PAYMENT_CONFIRMATION', 'DUPLICATE_PAYMENT'];

export function Refunds() {
  const { can } = useSession();
  const list = useListState({ status: 'all', reason: 'all' });
  const [retrying, setRetrying] = useState<Refund | null>(null);
  const retry = useRetryRefund();
  const canRetry = can('admin:finance:manage');

  const query = useMemo(
    () => ({
      page: list.page,
      limit: list.limit,
      status: list.filters.status === 'all' ? undefined : (list.filters.status as RefundStatus),
      reason: list.filters.reason === 'all' ? undefined : (list.filters.reason as RefundReason)
    }),
    [list.page, list.limit, list.filters]
  );
  const { data, isLoading, isError, error, refetch, isFetching } = useRefunds(query);

  const columns: Column<Refund>[] = [
  { key: 'id', header: 'Refund', cell: (r) => <span className="num font-mono text-[12.5px] font-medium" title={r.id}>{shortId(r.id)}</span> },
  { key: 'booking', header: 'Booking', cell: (r) => <span className="num font-mono text-[12.5px] text-ink-2" title={r.bookingId ?? ''}>{shortId(r.bookingId)}</span> },
  { key: 'amount', header: 'Amount', align: 'right', cell: (r) => <div><p className="num font-medium">{formatFils(r.amountMinor)}</p><p className="text-[11px] text-ink-3">{r.percent}% · {titleCase(r.type)}</p></div> },
  { key: 'reason', header: 'Reason', cell: (r) => <span className="block max-w-[200px] truncate text-ink-2" title={titleCase(r.reason)}>{titleCase(r.reason)}</span> },
  {
    key: 'status',
    header: 'Status',
    cell: (r) =>
    <div>
          <StatusBadge status={r.status} />
          {r.lastError && <p className="mt-1 max-w-[220px] truncate text-[11px] text-danger" title={r.lastError}>{r.lastError}</p>}
        </div>

  },
  { key: 'provider', header: 'Provider', cell: (r) => <span className="text-ink-2">{titleCase(r.provider)}</span> },
  {
    key: 'attempts',
    header: 'Attempts',
    cell: (r) =>
    <div className="num text-[12px] text-ink-2">
          {r.attempts} tried{r.failureCount > 0 ? ` · ${r.failureCount} failed` : ''}
          {r.nextRetryAt && r.status !== 'SUCCEEDED' && <p className="text-[11px] text-ink-3">next {formatRelative(r.nextRetryAt)}</p>}
        </div>

  },
  { key: 'updated', header: 'Updated', cell: (r) => <span className="num text-ink-3" title={formatSmartDate(r.updatedAt)}>{formatRelative(r.updatedAt)}</span> },
  {
    key: 'action',
    header: <span className="sr-only">Action</span>,
    align: 'right',
    cell: (r) =>
    r.status === 'FAILED' && canRetry ?
    <Button size="sm" variant="primary" icon={<RotateCwIcon className="h-3.5 w-3.5" />} onClick={(e) => {e.stopPropagation();setRetrying(r);}}>
            Retry
          </Button> :
    null
  }];


  return (
    <>
      <PageHeader title="Refunds" description="Refunds executed through the payment provider, with automatic retries. Amounts are decided by the server." />
      <Card flush>
        <SegmentedControl variant="underline" ariaLabel="Refund status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={TABS} />
        <FilterBar
          activeCount={list.filters.reason !== 'all' ? 1 : 0}
          onClear={() => list.setFilter('reason', 'all')}
          actions={data ? <span className="num text-[12px] text-ink-3">{data.meta.total.toLocaleString('en-US')} refunds</span> : undefined}>

          <Select label="Reason" value={list.filters.reason} onChange={(v) => list.setFilter('reason', v)} options={[{ value: 'all', label: 'All' }, ...REASONS.map((r) => ({ value: r, label: titleCase(r) }))]} />
        </FilterBar>
        {isError ?
        <ApiErrorState error={error} what="refunds" onRetry={() => refetch()} /> :

        <DataTable
          columns={columns}
          rows={data?.items}
          loading={isLoading}
          getRowId={(r) => r.id}
          minWidth={1100}
          caption="Refunds"
          rowClassName={(r) => r.status === 'FAILED' ? 'bg-danger-soft/30' : undefined}
          mobileRow={(r) =>
          <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink"><span className="num font-mono">{shortId(r.id)}</span> · {titleCase(r.reason)}</p>
                  <p className="truncate text-[12px] text-ink-3">{r.lastError ?? titleCase(r.provider)}</p>
                  {r.status === 'FAILED' && canRetry &&
              <Button size="sm" variant="primary" className="mt-2" icon={<RotateCwIcon className="h-3.5 w-3.5" />} onClick={(e) => {e.stopPropagation();setRetrying(r);}}>Retry</Button>
              }
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="num text-[13px] font-semibold">{formatFils(r.amountMinor)}</span>
                  <StatusBadge status={r.status} />
                </div>
              </div>
          }
          empty={<EmptyState icon={Undo2Icon} title={list.filters.status === 'FAILED' ? 'No failed refunds' : 'No refunds here'} description={list.filters.status === 'FAILED' ? 'Every refund has either completed or is still being processed.' : 'Refunds appear after a cancellation, a resolved dispute or a duplicate payment.'} />} />

        }
        {!isError && <Pagination meta={data?.meta} onPage={list.setPage} busy={isFetching} />}
      </Card>

      <ConfirmDialog
        open={Boolean(retrying)}
        onClose={() => setRetrying(null)}
        loading={retry.isPending}
        title="Retry this refund?"
        description={
        retrying &&
        <>
              The server re-opens the failed refund of <strong>{formatFils(retrying.amountMinor)}</strong> so the refund worker sends it to the payment provider again. The result appears here once the provider answers.
            </>

        }
        confirmLabel="Retry refund"
        onConfirm={() => {
          if (!retrying) return;
          retry.mutate(
            { id: retrying.id },
            {
              onSuccess: () => {
                toast.success('Refund re-opened', { description: 'It will be retried by the refund worker.' });
                setRetrying(null);
              },
              onError: (e) => toast.error(describeMutationError(e))
            }
          );
        }} />

    </>);

}

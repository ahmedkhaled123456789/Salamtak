import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BanknoteIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Pagination } from '../../components/ui/Pagination';
import { usePayouts } from '../../hooks/queries';
import { useCancelPayout } from '../../hooks/mutations';
import { useListState } from '../../hooks/useListState';
import { useSession } from '../../contexts/SessionContext';
import { describeMutationError } from '../../api/errors';
import { formatFils } from '../../utils/money';
import { formatRelative, formatSmartDate } from '../../utils/date';
import { shortId, titleCase } from '../../utils/people';
import type { Payout, PayoutStatus } from '../../api/types';

const TABS = [
{ value: 'all', label: 'All' },
{ value: 'PENDING', label: 'Pending' },
{ value: 'PROCESSING', label: 'Processing' },
{ value: 'PROVIDER_PAID', label: 'Provider paid' },
{ value: 'PAID', label: 'Paid' },
{ value: 'FAILED', label: 'Failed' },
{ value: 'CANCELLED', label: 'Cancelled' }];


export function Payouts() {
  const { can } = useSession();
  const list = useListState({ status: 'all' });
  const [cancelling, setCancelling] = useState<Payout | null>(null);
  const cancel = useCancelPayout();
  const canCancel = can('admin:finance:manage');

  const query = useMemo(() => ({ page: list.page, limit: list.limit, status: list.filters.status === 'all' ? undefined : (list.filters.status as PayoutStatus) }), [list.page, list.limit, list.filters.status]);
  const { data, isLoading, isError, error, refetch, isFetching } = usePayouts(query);

  const columns: Column<Payout>[] = [
  { key: 'id', header: 'Payout', cell: (p) => <span className="num font-mono text-[12.5px] font-medium" title={p.id}>{shortId(p.id)}</span> },
  { key: 'nurse', header: 'Nurse', cell: (p) => <span className="num font-mono text-[12px] text-ink-2" title={p.nurseId}>{shortId(p.nurseId)}</span> },
  { key: 'amount', header: 'Amount', align: 'right', cell: (p) => <span className="num font-medium">{formatFils(p.amountMinor)}</span> },
  {
    key: 'status',
    header: 'Status',
    cell: (p) =>
    <div>
          <StatusBadge status={p.status} />
          {p.lastError && <p className="mt-1 max-w-[240px] truncate text-[11px] text-danger" title={p.lastError}>{p.lastError}</p>}
        </div>

  },
  { key: 'provider', header: 'Provider', cell: (p) => <span className="text-ink-2">{titleCase(p.provider)}</span> },
  { key: 'attempts', header: 'Attempts', align: 'right', cell: (p) => <span className="num text-ink-2">{p.attempts}{p.nextRetryAt && p.status === 'FAILED' ? ` · next ${formatRelative(p.nextRetryAt)}` : ''}</span> },
  { key: 'requested', header: 'Requested', cell: (p) => <span className="num text-ink-2">{formatSmartDate(p.createdAt)}</span> },
  { key: 'paid', header: 'Paid', cell: (p) => <span className="num text-ink-3">{p.paidAt ? formatSmartDate(p.paidAt) : '—'}</span> },
  {
    key: 'action',
    header: <span className="sr-only">Action</span>,
    align: 'right',
    cell: (p) =>
    p.status === 'PENDING' && canCancel ?
    <Button size="sm" variant="danger" onClick={() => setCancelling(p)}>Cancel</Button> :
    null
  }];


  return (
    <>
      <PageHeader title="Payouts" description="Nurse earnings released to bank accounts. Eligibility, holds and amounts are decided by the server." />
      <Card flush>
        <SegmentedControl variant="underline" ariaLabel="Payout status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={TABS} />
        {isError ?
        <ApiErrorState error={error} what="payouts" onRetry={() => refetch()} /> :

        <DataTable
          columns={columns}
          rows={data?.items}
          loading={isLoading}
          getRowId={(p) => p.id}
          minWidth={980}
          caption="Payouts"
          rowClassName={(p) => p.status === 'FAILED' ? 'bg-danger-soft/30' : undefined}
          mobileRow={(p) =>
          <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="num font-mono text-[12.5px] font-medium text-ink">{shortId(p.id)}</p>
                  <p className="num text-[12px] text-ink-3">{formatSmartDate(p.createdAt)}</p>
                  {p.status === 'PENDING' && canCancel && <Button size="sm" variant="danger" className="mt-2" onClick={(e) => {e.stopPropagation();setCancelling(p);}}>Cancel</Button>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="num text-[13px] font-semibold">{formatFils(p.amountMinor)}</span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
          }
          empty={<EmptyState icon={BanknoteIcon} title="No payouts here" description="Payouts are created when nurses withdraw available earnings." />} />

        }
        {!isError && <Pagination meta={data?.meta} onPage={list.setPage} busy={isFetching} />}
      </Card>

      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        tone="danger"
        loading={cancel.isPending}
        title="Cancel this payout?"
        description={
        cancelling &&
        <>
              The pending payout of <strong>{formatFils(cancelling.amountMinor)}</strong> is cancelled and the server returns it to the nurse's available balance. Only payouts that have not started processing can be cancelled.
            </>

        }
        confirmLabel="Cancel payout"
        onConfirm={() => {
          if (!cancelling) return;
          cancel.mutate(
            { id: cancelling.id },
            {
              onSuccess: () => {
                toast.success('Payout cancelled');
                setCancelling(null);
              },
              onError: (e) => toast.error(describeMutationError(e))
            }
          );
        }} />

    </>);

}

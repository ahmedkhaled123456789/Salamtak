import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CopyIcon, EllipsisIcon, PauseIcon, PlayIcon, PlusIcon, TicketPercentIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { FilterBar } from '../../components/ui/FilterBar';
import { Select } from '../../components/ui/Select';
import { SummaryStrip } from '../../components/ui/SummaryStrip';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Dropdown } from '../../components/ui/Dropdown';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Pagination } from '../../components/ui/Pagination';
import { CouponModal } from '../../components/coupons/CouponModal';
import { useCoupons, useMarketplaceReport } from '../../hooks/queries';
import { useSetCouponActive } from '../../hooks/mutations';
import { useListState } from '../../hooks/useListState';
import { describeMutationError } from '../../api/errors';
import { formatBps, formatFils } from '../../utils/money';
import { formatDate } from '../../utils/date';
import { cn } from '../../utils/cn';
import type { Coupon } from '../../api/types';

/** Display-only status from the coupon's own fields (flag + validity window). The server enforces validity at redemption. */
function couponStatus(c: Coupon, now = Date.now()): {status: string;label: string;} {
  if (!c.active) return { status: 'paused', label: 'Deactivated' };
  if (new Date(c.endAt).getTime() < now) return { status: 'expired', label: 'Expired' };
  if (new Date(c.startAt).getTime() > now) return { status: 'scheduled', label: 'Scheduled' };
  return { status: 'active', label: 'Active' };
}

export function Coupons() {
  const list = useListState({ active: 'all' });
  const [open, setOpen] = useState(false);
  const [toggling, setToggling] = useState<Coupon | null>(null);
  const setActive = useSetCouponActive();

  const query = useMemo(() => ({ page: list.page, limit: list.limit, active: list.filters.active === 'all' ? undefined : list.filters.active === 'yes' }), [list.page, list.limit, list.filters.active]);
  const { data, isLoading, isError, error, refetch, isFetching } = useCoupons(query);
  const report = useMarketplaceReport();
  const c = report.data?.coupons;

  const columns: Column<Coupon>[] = [
  {
    key: 'code',
    header: 'Code',
    cell: (x) =>
    <div>
          <span className="num rounded border border-dashed border-line-strong bg-subtle/60 px-1.5 py-0.5 font-mono text-[12px] font-semibold tracking-wide text-ink">{x.code}</span>
          {x.description && <p className="mt-1 max-w-[260px] truncate text-[11.5px] text-ink-3">{x.description}</p>}
        </div>

  },
  { key: 'type', header: 'Type', cell: (x) => <span className="text-ink-2">{x.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed amount'}</span> },
  {
    key: 'discount',
    header: 'Discount',
    align: 'right',
    cell: (x) =>
    <div>
          <p className="num font-medium">{x.type === 'PERCENTAGE' ? formatBps(x.valueBps ?? 0) : formatFils(x.valueMinor ?? 0)}</p>
          {x.type === 'PERCENTAGE' && x.maxDiscountMinor != null && <p className="text-[11px] text-ink-3">max {formatFils(x.maxDiscountMinor, { decimals: false })}</p>}
        </div>

  },
  {
    key: 'usage',
    header: 'Used',
    cell: (x) => {
      if (x.usageLimit == null) return <span className="num text-ink-2">{x.usedCount.toLocaleString('en-US')} <span className="text-ink-3">/ no limit</span></span>;
      const pct = Math.min(100, x.usedCount / x.usageLimit * 100);
      return (
        <div className="w-32">
            <div className="num flex justify-between text-[12px]">
              <span className="font-medium text-ink">{x.usedCount.toLocaleString('en-US')}</span>
              <span className="text-ink-3">/ {x.usageLimit.toLocaleString('en-US')}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-subtle">
              <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-ink-3' : pct > 80 ? 'bg-warning' : 'bg-brand')} style={{ width: `${pct}%` }} />
            </div>
          </div>);

    }
  },
  { key: 'min', header: 'Min. booking', align: 'right', cell: (x) => <span className="num text-ink-2">{x.minBookingAmountMinor > 0 ? formatFils(x.minBookingAmountMinor, { decimals: false }) : '—'}</span> },
  { key: 'window', header: 'Valid', cell: (x) => <span className="num text-ink-2">{formatDate(x.startAt)} → {formatDate(x.endAt)}</span> },
  { key: 'status', header: 'Status', cell: (x) => {const s = couponStatus(x);return <StatusBadge status={s.status} label={s.label} />;} },
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    cell: (x) =>
    <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
        ariaLabel={`Actions for ${x.code}`}
        triggerClassName="rounded-md p-1.5 text-ink-3 hover:bg-subtle hover:text-ink"
        trigger={<EllipsisIcon className="h-4 w-4" />}
        items={[
        x.active ?
        { label: 'Deactivate', icon: PauseIcon, danger: true, onSelect: () => setToggling(x) } :
        { label: 'Activate', icon: PlayIcon, onSelect: () => setToggling(x) },
        { label: 'Copy code', icon: CopyIcon, onSelect: () => {void navigator.clipboard?.writeText(x.code);toast('Code copied');} }]
        } />

        </div>

  }];


  return (
    <>
      <PageHeader
        title="Coupons"
        description="Promotions funded by the platform. Discounts are applied and recorded by the server at booking time."
        actions={<Button variant="primary" icon={<PlusIcon className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>Create Coupon</Button>} />

      <SummaryStrip
        className="mb-5"
        loading={report.isLoading}
        items={[
        { label: 'Active', value: c ? c.active : '—', hint: c ? `of ${c.total} coupons` : undefined, tone: 'success' },
        { label: 'Redemptions', value: c ? c.redemptionsApplied.toLocaleString('en-US') : '—', hint: 'Applied to bookings' },
        { label: 'Released', value: c ? c.redemptionsReleased.toLocaleString('en-US') : '—', hint: 'Returned after cancellations' },
        { label: 'Discount granted', value: c ? formatFils(c.discountGrantedMinor, { decimals: false }) : '—', hint: 'All time', tone: 'warning' }]
        } />

      <Card flush>
        <FilterBar
          className="pt-4"
          activeCount={list.activeCount}
          onClear={list.reset}
          actions={data ? <span className="num text-[12px] text-ink-3">{data.meta.total.toLocaleString('en-US')} coupons</span> : undefined}>

          <Select label="State" value={list.filters.active} onChange={(v) => list.setFilter('active', v)} options={[{ value: 'all', label: 'All' }, { value: 'yes', label: 'Activated' }, { value: 'no', label: 'Deactivated' }]} />
        </FilterBar>
        {isError ?
        <ApiErrorState error={error} what="coupons" onRetry={() => refetch()} /> :

        <DataTable
          columns={columns}
          rows={data?.items}
          loading={isLoading}
          getRowId={(x) => x.id}
          minWidth={1040}
          caption="Coupons"
          mobileRow={(x) =>
          <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="num font-mono text-[12.5px] font-semibold text-ink">{x.code}</p>
                  <p className="truncate text-[12px] text-ink-3">{x.type === 'PERCENTAGE' ? formatBps(x.valueBps ?? 0) : formatFils(x.valueMinor ?? 0)} off · {x.usedCount} used</p>
                </div>
                {(() => {const s = couponStatus(x);return <StatusBadge status={s.status} label={s.label} />;})()}
              </div>
          }
          empty={
          <EmptyState
            icon={TicketPercentIcon}
            title={list.activeCount ? 'No coupons match' : 'No coupons yet'}
            description={list.activeCount ? 'Try a different filter.' : 'Create a coupon to run a promotion.'}
            action={<Button size="sm" variant="primary" icon={<PlusIcon className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>Create Coupon</Button>} />

          } />

        }
        {!isError && <Pagination meta={data?.meta} onPage={list.setPage} busy={isFetching} />}
      </Card>

      <CouponModal open={open} onClose={() => setOpen(false)} />

      <ConfirmDialog
        open={Boolean(toggling)}
        onClose={() => setToggling(null)}
        loading={setActive.isPending}
        tone={toggling?.active ? 'danger' : 'primary'}
        title={toggling?.active ? `Deactivate ${toggling.code}?` : `Activate ${toggling?.code ?? ''}?`}
        description={toggling?.active ? 'Patients can no longer apply it to new bookings. Existing bookings keep the discount they already have.' : 'Patients can apply it again within its validity dates.'}
        confirmLabel={toggling?.active ? 'Deactivate coupon' : 'Activate coupon'}
        onConfirm={() => {
          if (!toggling) return;
          setActive.mutate(
            { id: toggling.id, active: !toggling.active },
            {
              onSuccess: () => {
                toast.success(toggling.active ? `${toggling.code} deactivated` : `${toggling.code} activated`);
                setToggling(null);
              },
              onError: (e) => toast.error(describeMutationError(e))
            }
          );
        }} />

    </>);

}

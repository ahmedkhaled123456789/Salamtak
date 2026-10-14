import { useState } from 'react';
import { toast } from 'sonner';
import { CircleCheckIcon, RotateCwIcon, ScaleIcon, TriangleAlertIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { SummaryStrip } from '../../components/ui/SummaryStrip';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useAlerts, useReconciliation } from '../../hooks/queries';
import { useResolveAlert } from '../../hooks/mutations';
import { useSession } from '../../contexts/SessionContext';
import { describeMutationError } from '../../api/errors';
import { formatFils } from '../../utils/money';
import { formatRelative, formatSmartDate } from '../../utils/date';
import { cn } from '../../utils/cn';
import type { Alert } from '../../api/types';

interface Problem {
  id: string;
  check: string;
  message: string;
}

const alertColumns = (canResolve: boolean, onResolve: (a: Alert) => void): Column<Alert>[] => [
{ key: 'severity', header: 'Severity', cell: (a) => <StatusBadge status={a.severity === 'CRITICAL' ? 'critical' : a.severity === 'WARNING' ? 'warning' : 'information'} label={a.severity.charAt(0) + a.severity.slice(1).toLowerCase()} /> },
{ key: 'message', header: 'Alert', cell: (a) => <span className="block max-w-[420px] whitespace-normal text-ink">{a.message}</span> },
{ key: 'entity', header: 'Area', cell: (a) => <span className="text-ink-2">{a.entity}</span> },
{ key: 'count', header: 'Times', align: 'right', cell: (a) => <span className="num text-ink-2">{a.count}</span> },
{ key: 'seen', header: 'Last seen', cell: (a) => <span className="num text-ink-3">{formatRelative(a.lastSeenAt)}</span> },
{ key: 'action', header: <span className="sr-only">Action</span>, align: 'right', cell: (a) => canResolve ? <Button size="sm" onClick={() => onResolve(a)}>Resolve</Button> : null }];


export function Reconciliation() {
  const { can } = useSession();
  const report = useReconciliation();
  const alerts = useAlerts({ status: 'OPEN', limit: 10 });
  const resolve = useResolveAlert();
  const [resolving, setResolving] = useState<Alert | null>(null);
  const { data, isLoading, isError, error, refetch, isFetching } = report;

  const problems: Problem[] = (data?.checks ?? []).flatMap((c) => c.problems.map((message, i) => ({ id: `${c.name}-${i}`, check: c.name, message })));
  const healthy = data?.ok ?? false;
  const t = data?.totals;

  return (
    <>
      <PageHeader
        title="Financial Reconciliation"
        description="Read-only integrity checks over the ledger, wallets, payments, refunds and payouts. Figures are computed by the server."
        meta={
        data &&
        <>
              <span className="text-[12.5px] text-ink-3">
                Generated: <span className="font-medium text-ink">{formatSmartDate(data.generatedAt)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
                Status:
                {healthy ?
            <span className="inline-flex items-center gap-1 font-medium text-success"><CircleCheckIcon className="h-3.5 w-3.5" aria-hidden />All checks passed</span> :

            <span className="inline-flex items-center gap-1 font-medium text-warning"><TriangleAlertIcon className="h-3.5 w-3.5" aria-hidden />Needs review</span>
            }
              </span>
            </>

        }
        actions={
        <Button icon={<RotateCwIcon className="h-3.5 w-3.5" />} loading={isFetching} onClick={() => void refetch()}>
            Refresh report
          </Button>
        } />


      {isError ?
      <Card><ApiErrorState error={error} what="the reconciliation report" onRetry={() => refetch()} /></Card> :

      <div className="space-y-5">
          <SummaryStrip
          loading={isLoading}
          items={[
          { label: 'Gross booking value', value: t ? formatFils(t.grossMinor, { decimals: false }) : '—', hint: `${t?.bookingsPaid ?? 0} paid bookings · all time` },
          { label: 'Patients paid', value: t ? formatFils(t.patientPaidMinor, { decimals: false }) : '—', hint: 'After discounts', tone: 'brand' },
          { label: 'Platform commission', value: t ? formatFils(t.commissionMinor, { decimals: false }) : '—', hint: 'From booking snapshots', tone: 'success' },
          { label: 'Nurse earnings', value: t ? formatFils(t.nurseEarningMinor, { decimals: false }) : '—', hint: 'From booking snapshots', tone: 'info' },
          { label: 'Refunded', value: t ? formatFils(t.refundedMinor, { decimals: false }) : '—', tone: 'warning' },
          { label: 'Paid out', value: t ? formatFils(t.paidOutMinor, { decimals: false }) : '—', hint: 'Completed payouts' }]
          } />


          {!isLoading && !healthy && data &&
        <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3.5 sm:flex-row sm:items-center">
              <TriangleAlertIcon className="h-5 w-5 shrink-0 text-warning" aria-hidden />
              <div className="flex-1 text-[13px]">
                <p className="font-semibold text-ink">{data.checks.filter((c) => !c.ok).length} check{data.checks.filter((c) => !c.ok).length === 1 ? '' : 's'} reported problems</p>
                <p className="text-ink-2">The report is read-only. Nothing is changed by viewing it.</p>
              </div>
              <Button size="sm" onClick={() => document.getElementById('issues')?.scrollIntoView({ behavior: 'smooth' })}>View issues</Button>
            </div>
        }

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ?
          Array.from({ length: 6 }).map((_, i) =>
          <div key={i} className="rounded-xl border border-line bg-surface p-4">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="mt-3 h-6 w-24" />
                  </div>
          ) :
          data?.checks.map((c) =>
          <div key={c.name} className={cn('rounded-xl border bg-surface p-4 shadow-card', c.ok ? 'border-line' : 'border-warning/30')}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12.5px] font-medium capitalize text-ink-2">{c.name}</p>
                      {c.ok ? <CircleCheckIcon className="h-4 w-4 shrink-0 text-success" aria-label="Passed" /> : <TriangleAlertIcon className="h-4 w-4 shrink-0 text-warning" aria-label="Problems found" />}
                    </div>
                    <p className="num mt-2 text-[20px] font-semibold tracking-[-0.02em] text-ink">
                      {c.checked.toLocaleString('en-US')}
                      <span className="text-[13px] font-medium text-ink-3"> checked</span>
                    </p>
                    <p className={cn('mt-1 text-[11.5px]', c.ok ? 'text-ink-3' : 'font-medium text-warning')}>
                      {c.ok ? 'No problems' : `${c.problems.length} problem${c.problems.length === 1 ? '' : 's'}`}
                    </p>
                  </div>
          )}
          </div>

          <Card id="issues" title="Problems found" description="Reported by the checks above." flush>
            <DataTable
            columns={[
            { key: 'check', header: 'Check', cell: (p: Problem) => <span className="capitalize text-ink-2">{p.check}</span> },
            { key: 'message', header: 'Detail', cell: (p: Problem) => <span className="block max-w-[640px] whitespace-normal text-ink">{p.message}</span> }] as Column<Problem>[]}
            rows={isLoading ? undefined : problems}
            loading={isLoading}
            skeletonRows={3}
            getRowId={(p) => p.id}
            minWidth={760}
            caption="Reconciliation problems"
            mobileRow={(p) => <div><p className="text-[12px] capitalize text-ink-3">{p.check}</p><p className="mt-0.5 text-[13px] text-ink">{p.message}</p></div>}
            empty={<EmptyState icon={ScaleIcon} title="Everything reconciles" description="All checks passed: payments, refunds, wallets, earnings and payouts agree with each other." />} />

          </Card>

          <Card title="Open operational alerts" description="Failed refunds or payouts, shortfalls and similar conditions raised by background jobs." flush>
            {alerts.isError ?
          <ApiErrorState compact error={alerts.error} what="alerts" onRetry={() => alerts.refetch()} /> :

          <DataTable
            columns={alertColumns(can('admin:finance:manage'), setResolving)}
            rows={alerts.data?.items}
            loading={alerts.isLoading}
            skeletonRows={3}
            getRowId={(a) => a.id}
            minWidth={820}
            caption="Open alerts"
            empty={<EmptyState compact icon={CircleCheckIcon} title="No open alerts" description="Nothing needs attention right now." />} />

          }
          </Card>
        </div>
      }

      <ConfirmDialog
        open={Boolean(resolving)}
        onClose={() => setResolving(null)}
        loading={resolve.isPending}
        title="Mark this alert resolved?"
        description={resolving?.message}
        confirmLabel="Mark resolved"
        onConfirm={() => {
          if (!resolving) return;
          resolve.mutate(
            { id: resolving.id },
            {
              onSuccess: () => {
                toast.success('Alert resolved');
                setResolving(null);
              },
              onError: (e) => toast.error(describeMutationError(e))
            }
          );
        }} />

    </>);

}

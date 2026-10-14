import { EyeIcon, ServerIcon, TriangleAlertIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { SummaryStrip } from '../../components/ui/SummaryStrip';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { useQueueHealth } from '../../hooks/queries';
import { formatDuration, formatRelative } from '../../utils/date';
import { cn } from '../../utils/cn';
import type { QueueHealth as QueueHealthData } from '../../api/types';

type QueueRow = QueueHealthData['queues'][number];
type WorkerRow = QueueHealthData['workers'][number];
type SchedulerRow = QueueHealthData['schedulers'][number];

const num = (v: number, danger = false) =>
<span className={cn('num', danger && v > 0 ? 'font-semibold text-danger' : v === 0 ? 'text-ink-3' : 'text-ink')}>{v.toLocaleString('en-US')}</span>;


const queueColumns: Column<QueueRow>[] = [
{ key: 'name', header: 'Queue', cell: (q) => <span className="num font-mono text-[12.5px] font-medium text-ink">{q.queue}</span> },
{ key: 'waiting', header: 'Waiting', align: 'right', cell: (q) => num(q.waiting) },
{ key: 'active', header: 'Active', align: 'right', cell: (q) => num(q.active) },
{ key: 'delayed', header: 'Delayed', align: 'right', cell: (q) => num(q.delayed) },
{ key: 'failed', header: 'Failed', align: 'right', cell: (q) => num(q.failed, true) },
{ key: 'completed', header: 'Completed', align: 'right', cell: (q) => <span className="num text-ink-2">{q.completed.toLocaleString('en-US')}</span> },
{ key: 'paused', header: 'Paused', align: 'right', cell: (q) => num(q.paused) },
{ key: 'oldest', header: 'Oldest waiting', align: 'right', cell: (q) => <span className={cn('num', q.oldestWaitingSeconds > 120 ? 'font-medium text-warning' : 'text-ink-3')}>{q.oldestWaitingSeconds ? formatDuration(q.oldestWaitingSeconds) : '—'}</span> }];


const workerColumns: Column<WorkerRow>[] = [
{ key: 'id', header: 'Worker', cell: (w) => <span className="num font-mono text-[12px] text-ink" title={w.id}>{w.id.length > 18 ? `${w.id.slice(0, 18)}…` : w.id}</span> },
{ key: 'queues', header: 'Queues', cell: (w) => <span className="text-ink-2">{w.queues.length}</span> },
{ key: 'started', header: 'Started', cell: (w) => <span className="num text-ink-3">{formatRelative(w.startedAt)}</span> },
{ key: 'seen', header: 'Last heartbeat', cell: (w) => <span className="num text-ink-3">{formatRelative(w.lastSeenAt)}</span> },
{ key: 'alive', header: 'State', cell: (w) => <StatusBadge status={w.alive ? 'active' : 'failed'} label={w.alive ? 'Alive' : 'Stale'} /> }];


const schedulerColumns: Column<SchedulerRow>[] = [
{ key: 'queue', header: 'Queue', cell: (s) => <span className="num font-mono text-[12px] text-ink">{s.queue}</span> },
{ key: 'job', header: 'Job', cell: (s) => <span className="text-ink-2">{s.job}</span> },
{ key: 'every', header: 'Runs every', align: 'right', cell: (s) => <span className="num text-ink-2">{s.everySeconds ? formatDuration(s.everySeconds) : '—'}</span> }];


export function QueueHealth() {
  const { data, isLoading, isError, error, refetch } = useQueueHealth(15_000);
  const queues = data?.queues ?? [];
  const totals = queues.reduce((a, q) => ({ waiting: a.waiting + q.waiting, active: a.active + q.active, failed: a.failed + q.failed, delayed: a.delayed + q.delayed }), { waiting: 0, active: 0, failed: 0, delayed: 0 });
  const alive = data?.workers.filter((w) => w.alive).length ?? 0;

  return (
    <>
      <PageHeader
        title="Queue Health"
        description="Background job queues powering bookings, money movement and notifications."
        meta={
        <>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-subtle px-2 py-0.5 text-[11.5px] font-medium text-ink-2">
              <EyeIcon className="h-3 w-3" aria-hidden />
              Read-only
            </span>
            <span className="text-[12px] text-ink-3">Auto-refresh every 15s{data ? ` · backend: ${data.backend}` : ''}</span>
          </>
        } />


      {!isLoading && !isError && data && !data.available &&
      <div role="alert" className="mb-5 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-[13px]">
          <TriangleAlertIcon className="h-4 w-4 shrink-0 text-warning" aria-hidden />
          <p className="text-ink-2">
            <span className="font-semibold text-ink">Queue monitor unavailable.</span> {data.error ?? 'The queue backend did not respond.'} Jobs keep running in the background.
          </p>
        </div>
      }

      <SummaryStrip
        className="mb-5"
        loading={isLoading}
        items={[
        { label: 'Waiting', value: totals.waiting.toLocaleString('en-US'), hint: `Across ${queues.length} queues` },
        { label: 'Active', value: totals.active, hint: 'Being processed', tone: 'info' },
        { label: 'Failed', value: totals.failed, hint: 'Kept for inspection', tone: totals.failed ? 'danger' : 'success' },
        { label: 'Delayed', value: totals.delayed, hint: 'Scheduled for later' },
        { label: 'Workers alive', value: `${alive}/${data?.workers.length ?? 0}`, hint: 'By heartbeat', tone: alive > 0 ? 'success' : 'danger' }]
        } />


      <div className="space-y-5">
        <Card flush title="Queues" description="Failed jobs are highlighted; an oldest-waiting time above 2 minutes is shown in amber.">
          {isError ?
          <ApiErrorState error={error} what="the queue monitor" onRetry={() => refetch()} /> :

          <DataTable
            columns={queueColumns}
            rows={queues}
            loading={isLoading}
            skeletonRows={6}
            getRowId={(q) => q.queue}
            minWidth={860}
            caption="Queue health"
            mobileRow={(q) =>
            <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="num font-mono text-[12.5px] font-medium text-ink">{q.queue}</p>
                    <p className="num text-[12px] text-ink-3">{q.waiting} waiting · {q.active} active · {q.failed} failed</p>
                  </div>
                </div>
            }
            empty={<EmptyState icon={ServerIcon} title="No queues reported" description="The monitor hasn't reported any queues. Check that the workers are running." />} />

          }
        </Card>

        {!isError &&
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card flush title="Workers">
              <DataTable columns={workerColumns} rows={data?.workers} loading={isLoading} skeletonRows={2} getRowId={(w) => w.id} minWidth={560} caption="Workers" empty={<EmptyState compact icon={ServerIcon} title="No workers reporting" description="No worker has sent a heartbeat recently." />} />
            </Card>
            <Card flush title="Schedulers">
              <DataTable columns={schedulerColumns} rows={data?.schedulers} loading={isLoading} skeletonRows={2} getRowId={(s) => `${s.queue}-${s.job}`} minWidth={480} caption="Schedulers" empty={<EmptyState compact icon={ServerIcon} title="No schedulers" description="No repeatable jobs are registered." />} />
            </Card>
          </div>
        }
      </div>
    </>);

}

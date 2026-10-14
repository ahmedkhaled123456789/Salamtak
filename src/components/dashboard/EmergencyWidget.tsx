import { Link } from 'react-router-dom';
import { ArrowRightIcon, MapPinIcon, ShieldCheckIcon, TimerIcon } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import { ApiErrorState } from '../ui/ApiErrorState';
import { useEmergencyRequests, useMarketplaceReport } from '../../hooks/queries';
import { formatCountdown, minutesUntil } from '../../utils/date';
import { shortId, titleCase } from '../../utils/people';
import { cn } from '../../utils/cn';
import type { EmergencyStatus } from '../../api/types';

const counters: {key: EmergencyStatus;label: string;dot: string;}[] = [
{ key: 'PENDING', label: 'Pending', dot: 'bg-danger' },
{ key: 'MATCHING', label: 'Matching', dot: 'bg-warning' },
{ key: 'NURSE_OFFERED', label: 'Offered', dot: 'bg-info' },
{ key: 'ACCEPTED', label: 'Accepted', dot: 'bg-success' }];

const OPEN: EmergencyStatus[] = ['PENDING', 'MATCHING', 'NURSE_OFFERED'];

export function EmergencyWidget({ className }: {className?: string;}) {
  const report = useMarketplaceReport();
  const requests = useEmergencyRequests({ limit: 20 }, 30_000);
  const urgent = (requests.data?.items ?? []).
  filter((r) => OPEN.includes(r.status)).
  sort((a, b) => minutesUntil(a.requestedStart) - minutesUntil(b.requestedStart)).
  slice(0, 4);

  return (
    <section className={cn('relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card', className)}>
      <span className="absolute inset-x-0 top-0 h-[2px] bg-danger/70" aria-hidden />
      <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
        <div>
          <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">Emergency Requests</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">Same-day requests that need a nurse</p>
        </div>
      </header>

      {report.isError || requests.isError ?
      <ApiErrorState compact error={report.error ?? requests.error} what="emergency requests" onRetry={() => {void report.refetch();void requests.refetch();}} /> :

      <>
          <div className="mx-5 grid grid-cols-4 overflow-hidden rounded-lg border border-line">
            {counters.map((c, i) =>
          <div key={c.key} className={cn('px-3 py-2.5', i > 0 && 'border-l border-line')}>
                <p className="flex items-center gap-1.5 text-[11px] text-ink-3">
                  <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} aria-hidden />
                  {c.label}
                </p>
                {report.isLoading ?
            <Skeleton className="mt-1.5 h-5 w-6" /> :
            <p className="num mt-0.5 text-[18px] font-semibold text-ink">{report.data?.emergencyByStatus[c.key] ?? 0}</p>
            }
              </div>
          )}
          </div>

          <div className="mt-3 flex-1">
            {requests.isLoading ?
          <div className="space-y-3 px-5 py-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> :
          urgent.length === 0 ?
          <EmptyState compact icon={ShieldCheckIcon} title="No open requests" description="Every emergency request has been matched or closed." /> :

          <ul className="divide-y divide-line border-t border-line">
                {urgent.map((r) => {
              const mins = minutesUntil(r.requestedStart);
              return (
                <li key={r.id}>
                      <Link to="/emergency" className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-subtle/60">
                        <div className="min-w-0 flex-1">
                          <p className="num font-mono text-[13px] font-medium text-ink">{shortId(r.id)}</p>
                          <p className="mt-0.5 flex items-center gap-3 text-[12px] text-ink-3">
                            <span className="inline-flex items-center gap-1"><MapPinIcon className="h-3 w-3" aria-hidden />{r.location.city ?? '—'}</span>
                            <span className={cn('num inline-flex items-center gap-1', mins < 60 && 'font-medium text-danger')}>
                              <TimerIcon className="h-3 w-3" aria-hidden />
                              {formatCountdown(r.requestedStart)}
                            </span>
                          </p>
                        </div>
                        <StatusBadge status={r.status} label={titleCase(r.status)} />
                      </Link>
                    </li>);

            })}
              </ul>
          }
          </div>
        </>
      }
      <footer className="border-t border-line px-5 py-3">
        <Link to="/emergency" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline">
          Open emergency console
          <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </footer>
    </section>);

}

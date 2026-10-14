import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { LockIcon, MapPinIcon, RadarIcon, ShieldCheckIcon, SirenIcon, TimerIcon, UserCheckIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SummaryStrip } from '../../components/ui/SummaryStrip';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DetailList } from '../../components/ui/DetailList';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Pagination } from '../../components/ui/Pagination';
import { useEmergencyDetail, useEmergencyRequests, useMarketplaceReport, useServices } from '../../hooks/queries';
import { useCancelEmergency, useReopenEmergency } from '../../hooks/mutations';
import { useSession } from '../../contexts/SessionContext';
import { describeMutationError } from '../../api/errors';
import { formatCountdown, formatDateTime, formatMinutes, formatRelative, minutesUntil } from '../../utils/date';
import { shortId, titleCase } from '../../utils/people';
import { cn } from '../../utils/cn';
import type { EmergencyRequest, EmergencyStatus } from '../../api/types';
import type { Tone } from '../../types/domain';

const STATUSES: EmergencyStatus[] = ['PENDING', 'MATCHING', 'NURSE_OFFERED', 'ACCEPTED', 'EXPIRED', 'CANCELLED', 'FAILED'];
const tone: Record<EmergencyStatus, Tone> = { PENDING: 'danger', MATCHING: 'warning', NURSE_OFFERED: 'info', ACCEPTED: 'success', EXPIRED: 'neutral', CANCELLED: 'neutral', FAILED: 'danger' };
const OPEN: EmergencyStatus[] = ['PENDING', 'MATCHING', 'NURSE_OFFERED'];
const REOPENABLE: EmergencyStatus[] = ['FAILED', 'EXPIRED'];

export function EmergencyRequests() {
  const { can } = useSession();
  const [filter, setFilter] = useState<EmergencyStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const query = useMemo(() => ({ page, limit: 20, status: filter === 'all' ? undefined : filter }), [page, filter]);
  const list = useEmergencyRequests(query, 15_000);
  const report = useMarketplaceReport();
  const services = useServices({ limit: 100 });
  const detail = useEmergencyDetail(selectedId);
  const cancel = useCancelEmergency();
  const reopen = useReopenEmergency();

  const serviceName = useMemo(() => new Map((services.data?.items ?? []).map((s) => [s.id, s.name])), [services.data]);
  const nameOf = (r: EmergencyRequest) => serviceName.get(r.serviceId) ?? 'Care service';
  const manage = can('admin:emergency:manage');
  const selected = detail.data?.request ?? null;

  const pick = (s: EmergencyStatus | 'all') => {
    setFilter(s);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Emergency Requests"
        description="Same-day care requests that need a nurse fast."
        meta={
        <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            Live · auto-refresh every 15s
          </span>
        } />


      <SummaryStrip
        className="mb-5"
        loading={report.isLoading}
        items={STATUSES.map((s) => ({
          label: titleCase(s),
          value: report.data ? report.data.emergencyByStatus[s] ?? 0 : '—',
          tone: tone[s],
          active: filter === s,
          onClick: () => pick(filter === s ? 'all' : s)
        }))} />


      {list.isError ?
      <Card><ApiErrorState error={list.error} what="emergency requests" onRetry={() => list.refetch()} /></Card> :

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Card
          className="lg:col-span-7"
          title={filter === 'all' ? 'All requests' : `${titleCase(filter)} requests`}
          description={list.data ? `${list.data.meta.total.toLocaleString('en-US')} requests` : undefined}
          flush
          actions={filter !== 'all' && <Button size="sm" variant="ghost" onClick={() => pick('all')}>Show all</Button>}>

            {list.isLoading ?
          <div className="space-y-px border-t border-line">
                {Array.from({ length: 5 }).map((_, i) =>
            <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-3 w-40" /><Skeleton className="h-2.5 w-28" /></div>
                    <Skeleton className="h-5 w-16" />
                  </div>
            )}
              </div> :
          !list.data || list.data.items.length === 0 ?
          <EmptyState icon={ShieldCheckIcon} title="No emergency requests" description={filter === 'all' ? 'There are no emergency requests. New requests appear here automatically.' : `No ${titleCase(filter).toLowerCase()} requests right now.`} /> :

          <ul className="divide-y divide-line border-t border-line">
                {list.data.items.map((r) => {
              const mins = minutesUntil(r.requestedStart);
              const open = OPEN.includes(r.status);
              const urgent = open && mins < 75;
              return (
                <li key={r.id}>
                      <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    aria-pressed={selectedId === r.id}
                    className={cn('relative flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-subtle/60', selectedId === r.id && 'bg-subtle/80')}>

                        {selectedId === r.id && <span className="absolute inset-y-0 left-0 w-[2px] bg-brand" aria-hidden />}
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', urgent ? 'bg-danger-soft text-danger ring-danger/15' : 'bg-subtle text-ink-3 ring-line')}>
                          <SirenIcon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-[13px]">
                            <span className="num font-mono font-medium text-ink">{shortId(r.id)}</span>
                            <span className="truncate text-ink-2">{nameOf(r)}</span>
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12px] text-ink-3">
                            <span className="inline-flex items-center gap-1"><MapPinIcon className="h-3 w-3" aria-hidden />{r.location.city ?? 'City not recorded'}</span>
                            {open &&
                        <span className={cn('num inline-flex items-center gap-1', urgent && 'font-medium text-danger')}>
                                <TimerIcon className="h-3 w-3" aria-hidden />
                                {formatCountdown(r.requestedStart)}
                              </span>
                        }
                            {r.offersMade > 0 && <span>{r.offersMade} offer{r.offersMade === 1 ? '' : 's'} sent</span>}
                          </p>
                        </div>
                        <StatusBadge status={r.status} tone={tone[r.status]} />
                      </button>
                    </li>);

            })}
              </ul>
          }
            <Pagination meta={list.data?.meta} onPage={setPage} busy={list.isFetching} />
          </Card>

          <Card className="lg:col-span-5 lg:sticky lg:top-20 lg:self-start" title="Request details" flush>
            {!selectedId ?
          <EmptyState compact icon={SirenIcon} title="Select a request" description="Choose a request on the left to see its matching progress." /> :
          detail.isError ?
          <ApiErrorState compact error={detail.error} what="this request" onRetry={() => detail.refetch()} /> :
          detail.isLoading || !selected ?
          <div className="space-y-3 border-t border-line p-5"><Skeleton className="h-5 w-40" /><Skeleton className="h-24 w-full" /><Skeleton className="h-16 w-full" /></div> :

          <div className="border-t border-line px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="num font-mono text-[15px] font-semibold text-ink" title={selected.id}>{shortId(selected.id)}</p>
                    <p className="text-[12.5px] text-ink-3">Requested {formatRelative(selected.createdAt)}</p>
                  </div>
                  <StatusBadge status={selected.status} tone={tone[selected.status]} />
                </div>

                {OPEN.includes(selected.status) &&
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-warning/25 bg-warning-soft px-3 py-2.5">
                    <RadarIcon className="h-4 w-4 shrink-0 text-warning" aria-hidden />
                    <p className="flex-1 text-[12.5px] text-ink-2">
                      {selected.offersMade} offer{selected.offersMade === 1 ? '' : 's'} sent so far.{' '}
                      <span className="font-medium text-warning">{formatCountdown(selected.requestedStart)}</span>
                    </p>
                  </div>
            }
                {selected.statusReason && <p className="mt-3 rounded-md bg-subtle/70 px-2.5 py-2 text-[12px] text-ink-2">{selected.statusReason}</p>}

                <DetailList
              className="mt-3"
              items={[
              { label: 'Patient', value: detail.data?.patientName ?? <span className="text-ink-3">Not available</span> },
              { label: 'Service', value: nameOf(selected) },
              { label: 'Duration', value: formatMinutes(selected.durationMinutes) },
              { label: 'City', value: selected.location.city ?? '—' },
              { label: 'Visit starts', value: formatDateTime(selected.requestedStart) },
              { label: 'Request expires', value: formatDateTime(selected.expiresAt) },
              { label: 'Accepted by', value: selected.acceptedNurseId ? <span className="num inline-flex items-center gap-1 font-mono text-[12px]"><UserCheckIcon className="h-3 w-3" aria-hidden />{shortId(selected.acceptedNurseId)}</span> : <span className="text-ink-3">Not matched yet</span> },
              { label: 'Booking', value: selected.bookingId ? (can('admin:bookings:read') ? <Link to={`/bookings`} className="num font-mono text-brand hover:underline">{shortId(selected.bookingId)}</Link> : shortId(selected.bookingId)) : <span className="text-ink-3">—</span> }]
              } />


                <p className="mt-3 flex items-start gap-1.5 rounded-md bg-subtle/70 px-2.5 py-2 text-[11.5px] text-ink-3">
                  <LockIcon className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  Exact address, coordinates and clinical notes are not shown here — only the accepting nurse sees them.
                </p>

                <h3 className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">Offers to nurses</h3>
                {detail.data && detail.data.offers.length > 0 ?
            <ul className="divide-y divide-line rounded-lg border border-line">
                    {detail.data.offers.map((o) =>
              <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]">
                        <div>
                          <p className="num font-mono text-ink" title={o.nurseId}>{shortId(o.nurseId)}</p>
                          <p className="text-[11.5px] text-ink-3">Round {o.round}{o.respondedAt ? ` · answered ${formatRelative(o.respondedAt)}` : ` · expires ${formatRelative(o.expiresAt)}`}</p>
                        </div>
                        <StatusBadge status={o.status} />
                      </li>
              )}
                  </ul> :

            <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[12.5px] text-ink-3">No offers sent yet.</p>
            }

                {manage && (OPEN.includes(selected.status) || REOPENABLE.includes(selected.status)) &&
            <div className="mt-5 flex gap-2 border-t border-line pt-4">
                    {REOPENABLE.includes(selected.status) &&
              <Button
                size="sm"
                variant="primary"
                loading={reopen.isPending}
                onClick={() => reopen.mutate({ id: selected.id }, { onSuccess: () => toast.success('Request reopened', { description: 'The server starts another matching round.' }), onError: (e) => toast.error(describeMutationError(e)) })}>

                        Reopen for matching
                      </Button>
              }
                    {OPEN.includes(selected.status) &&
              <Button size="sm" variant="danger" onClick={() => setCancelling(true)}>Cancel request</Button>
              }
                  </div>
            }
              </div>
          }
          </Card>
        </div>
      }

      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        tone="danger"
        requireReason
        loading={cancel.isPending}
        title="Cancel this emergency request?"
        description="Matching stops and the patient is notified by the server. This cannot be undone."
        confirmLabel="Cancel request"
        onConfirm={(reason) => {
          if (!selected) return;
          cancel.mutate(
            { id: selected.id, reason },
            {
              onSuccess: () => {
                toast.success('Emergency request cancelled');
                setCancelling(false);
              },
              onError: (e) => toast.error(describeMutationError(e))
            }
          );
        }} />

    </>);

}

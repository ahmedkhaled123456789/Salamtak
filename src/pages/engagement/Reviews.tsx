import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, EyeOffIcon, FlagIcon, InfoIcon, MessageSquareQuoteIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { RatingStars } from '../../components/ui/RatingStars';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DetailList } from '../../components/ui/DetailList';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Pagination } from '../../components/ui/Pagination';
import { useMarketplaceReport, useReviews } from '../../hooks/queries';
import { useModerateReview } from '../../hooks/mutations';
import type { ModerationAction } from '../../hooks/mutations';
import { describeMutationError } from '../../api/errors';
import { formatDateTime, formatRelative } from '../../utils/date';
import { shortId } from '../../utils/people';
import { cn } from '../../utils/cn';
import type { ReviewStatus } from '../../api/types';

type Tab = 'all' | ReviewStatus;

const statusLabel: Record<ReviewStatus, string> = { ACTIVE: 'Published', FLAGGED: 'Flagged', HIDDEN: 'Hidden' };

const dialog: Record<ModerationAction, {title: string;description: string;confirm: string;tone: 'primary' | 'danger';reason: boolean;done: string;}> = {
  hide: { title: 'Hide this review?', description: 'It is removed from the nurse’s public reviews and from rating averages.', confirm: 'Hide review', tone: 'danger', reason: true, done: 'Review hidden' },
  flag: { title: 'Flag this review?', description: 'It is hidden from the public and excluded from rating averages until a moderator restores it.', confirm: 'Flag review', tone: 'danger', reason: true, done: 'Review flagged' },
  restore: { title: 'Restore this review?', description: 'It becomes public again and counts toward the nurse’s rating.', confirm: 'Restore review', tone: 'primary', reason: false, done: 'Review restored' }
};

export function Reviews() {
  const [tab, setTab] = useState<Tab>('FLAGGED');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<ModerationAction | null>(null);
  const moderate = useModerateReview();

  const query = useMemo(() => ({ page, limit: 20, status: tab === 'all' ? undefined : tab }), [page, tab]);
  const { data, isLoading, isError, error, refetch, isFetching } = useReviews(query);
  const report = useMarketplaceReport();

  const rows = useMemo(() => data?.items ?? [], [data]);
  useEffect(() => {
    if (rows.length && !rows.find((r) => r.id === selectedId)) setSelectedId(rows[0].id);
    if (!rows.length) setSelectedId(null);
  }, [rows, selectedId]);
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const by = report.data?.reviewsByStatus ?? {};
  const excluded = (by.FLAGGED ?? 0) + (by.HIDDEN ?? 0);
  const avg = report.data?.averageRatingActive;

  const submit = (reason: string) => {
    if (!selected || !action) return;
    const cfg = dialog[action];
    moderate.mutate(
      { id: selected.id, action, reason },
      {
        onSuccess: () => {
          toast.success(cfg.done);
          setAction(null);
        },
        onError: (e) => toast.error(describeMutationError(e))
      }
    );
  };

  return (
    <>
      <PageHeader title="Reviews" description="Moderate patient feedback. Flagged and hidden reviews never reach nurse profiles or rating averages." />

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_1.4fr]">
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <p className="text-[12.5px] font-medium text-ink-2">Public rating</p>
          {report.isLoading ? <Skeleton className="mt-3 h-8 w-28" /> :
          <div className="mt-2 flex items-baseline gap-2">
              <span className="num text-[30px] font-semibold leading-none tracking-[-0.03em] text-ink">{avg != null ? avg.toFixed(2) : '—'}</span>
              {avg != null && <RatingStars rating={avg} size="md" />}
            </div>
          }
          <p className="num mt-2 text-[12px] text-ink-3">{(by.ACTIVE ?? 0).toLocaleString('en-US')} published reviews</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
          <p className="text-[12.5px] font-medium text-ink-2">By status</p>
          <dl className="mt-2.5 space-y-1.5 text-[13px]">
            {(['ACTIVE', 'FLAGGED', 'HIDDEN'] as const).map((s) =>
            <div key={s} className="flex items-center justify-between">
                <dt className="text-ink-3">{statusLabel[s]}</dt>
                <dd className="num font-medium text-ink">{report.data ? (by[s] ?? 0).toLocaleString('en-US') : '—'}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-line bg-surface p-5 shadow-card">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
            <InfoIcon className="h-4 w-4" aria-hidden />
          </span>
          <div className="text-[13px]">
            <p className="font-medium text-ink">{report.data ? `${excluded.toLocaleString('en-US')} reviews excluded from aggregates` : 'Excluded from aggregates'}</p>
            <p className="mt-1 text-ink-3">Flagged and hidden reviews don't count toward nurse ratings or the public average. The server enforces this; restoring a review is the only way back in.</p>
          </div>
        </div>
      </div>

      <Card flush>
        <SegmentedControl
          variant="underline"
          ariaLabel="Review status"
          value={tab}
          onChange={(v) => {
            setTab(v);
            setPage(1);
          }}
          options={[
          { value: 'FLAGGED', label: 'Flagged', count: report.data ? by.FLAGGED ?? 0 : undefined },
          { value: 'HIDDEN', label: 'Hidden', count: report.data ? by.HIDDEN ?? 0 : undefined },
          { value: 'ACTIVE', label: 'Published', count: report.data ? by.ACTIVE ?? 0 : undefined },
          { value: 'all', label: 'All' }]
          } />

        {isError ?
        <ApiErrorState error={error} what="reviews" onRetry={() => refetch()} /> :
        isLoading ?
        <div className="space-y-4 p-5">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div> :
        rows.length === 0 ?
        <EmptyState
          icon={MessageSquareQuoteIcon}
          title={tab === 'FLAGGED' ? 'No flagged reviews' : 'No reviews here'}
          description={tab === 'FLAGGED' ? 'Nothing is waiting for moderation.' : 'Reviews appear after patients rate completed visits.'} /> :


        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px]">
            <div className="lg:border-r lg:border-line">
              <ul className="divide-y divide-line">
                {rows.map((r) =>
              <li key={r.id}>
                    <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  aria-pressed={selectedId === r.id}
                  className={cn('relative w-full px-5 py-4 text-left transition-colors hover:bg-subtle/60', selectedId === r.id && 'bg-subtle/80')}>

                      {selectedId === r.id && <span className="absolute inset-y-0 left-0 w-[2px] bg-brand" aria-hidden />}
                      <div className="flex items-center gap-2">
                        <RatingStars rating={r.rating} />
                        {r.status !== 'ACTIVE' && <StatusBadge status={r.status} label={statusLabel[r.status]} />}
                        <span className="ml-auto text-[11.5px] text-ink-3">{formatRelative(r.createdAt)}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink">{r.comment ? `“${r.comment}”` : <span className="text-ink-3">No written comment</span>}</p>
                      <p className="mt-1 text-[12px] text-ink-3">Nurse <span className="num font-mono">{shortId(r.nurseId)}</span> · Booking <span className="num font-mono">{shortId(r.bookingId)}</span></p>
                    </button>
                  </li>
              )}
              </ul>
              <Pagination meta={data?.meta} onPage={setPage} busy={isFetching} />
            </div>

            {selected &&
          <aside className="border-t border-line p-5 lg:border-t-0" aria-label="Review detail">
                <div className="flex items-center justify-between">
                  <RatingStars rating={selected.rating} size="md" />
                  <StatusBadge status={selected.status} label={statusLabel[selected.status]} />
                </div>
                <blockquote className="mt-3 text-[14px] leading-relaxed text-ink">{selected.comment ? `“${selected.comment}”` : <span className="text-ink-3">No written comment</span>}</blockquote>

                {selected.moderationReason &&
            <div className={cn('mt-4 flex items-start gap-2 rounded-lg px-3 py-2.5 text-[12.5px]', selected.status === 'FLAGGED' ? 'bg-warning-soft' : 'bg-subtle')}>
                    <FlagIcon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', selected.status === 'FLAGGED' ? 'text-warning' : 'text-ink-3')} aria-hidden />
                    <div>
                      <p className="font-medium text-ink">Moderation note</p>
                      <p className="text-ink-2">{selected.moderationReason}</p>
                    </div>
                  </div>
            }

                <DetailList
              className="mt-4"
              items={[
              { label: 'Nurse', value: selected.nurseId, mono: true },
              { label: 'Booking', value: selected.bookingId, mono: true },
              { label: 'Created', value: formatDateTime(selected.createdAt) },
              ...(selected.moderatedAt ? [{ label: 'Moderated', value: formatDateTime(selected.moderatedAt) }] : []),
              { label: 'Visibility', value: selected.status === 'ACTIVE' ? 'Public' : 'Hidden from public' }]
              } />


                <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                  {selected.status === 'ACTIVE' &&
              <>
                      <Button icon={<FlagIcon className="h-3.5 w-3.5" />} onClick={() => setAction('flag')}>Flag</Button>
                      <Button variant="danger" icon={<EyeOffIcon className="h-3.5 w-3.5" />} onClick={() => setAction('hide')}>Hide review</Button>
                    </>
              }
                  {selected.status === 'FLAGGED' &&
              <Button icon={<EyeOffIcon className="h-3.5 w-3.5" />} onClick={() => setAction('hide')}>Hide permanently</Button>
              }
                  {selected.status !== 'ACTIVE' &&
              <Button variant="primary" icon={<CheckIcon className="h-3.5 w-3.5" />} onClick={() => setAction('restore')}>Restore</Button>
              }
                </div>
              </aside>
          }
          </div>
        }
      </Card>

      <ConfirmDialog
        open={Boolean(action)}
        onClose={() => setAction(null)}
        loading={moderate.isPending}
        tone={action ? dialog[action].tone : 'primary'}
        requireReason={action ? dialog[action].reason : false}
        reasonLabel="Moderation note"
        title={action ? dialog[action].title : ''}
        description={action ? dialog[action].description : ''}
        confirmLabel={action ? dialog[action].confirm : ''}
        onConfirm={submit} />

    </>);

}

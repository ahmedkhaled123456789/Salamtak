import { Link } from 'react-router-dom';
import { ArrowRightIcon, EyeOffIcon, FlagIcon, MessageSquareQuoteIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { RatingStars } from '../ui/RatingStars';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ApiErrorState } from '../ui/ApiErrorState';
import { useMarketplaceReport, useReviews } from '../../hooks/queries';
import { formatRelative } from '../../utils/date';
import { shortId } from '../../utils/people';
import { cn } from '../../utils/cn';

export function ReviewsFeed({ className }: {className?: string;}) {
  const reviews = useReviews({ limit: 4 });
  const report = useMarketplaceReport();
  const by = report.data?.reviewsByStatus ?? {};
  const avg = report.data?.averageRatingActive;
  const excluded = (by.FLAGGED ?? 0) + (by.HIDDEN ?? 0);

  return (
    <Card
      className={className}
      title="Recent Reviews"
      description="Latest patient feedback after completed visits"
      actions={
      <Link to="/reviews" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline">
          Moderation
          <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
        </Link>
      }>

      {reviews.isError ?
      <ApiErrorState compact error={reviews.error} what="reviews" onRetry={() => {void reviews.refetch();void report.refetch();}} /> :

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="lg:border-r lg:border-line lg:pr-6">
            {report.isLoading ? <Skeleton className="h-10 w-28" /> :
          <div className="flex items-baseline gap-2">
                <span className="num text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink">{avg != null ? avg.toFixed(2) : '—'}</span>
                {avg != null && <span className="text-[12px] text-ink-3">/ 5</span>}
              </div>
          }
            {avg != null && <RatingStars rating={avg} size="md" className="mt-2" />}
            <p className="mt-1 text-[12px] text-ink-3">{report.data ? `${(by.ACTIVE ?? 0).toLocaleString('en-US')} published reviews` : ''}</p>
            {excluded > 0 &&
          <p className="mt-4 rounded-md bg-warning-soft px-2.5 py-2 text-[11.5px] leading-snug text-warning">
                {excluded} flagged or hidden review{excluded === 1 ? '' : 's'} are excluded from public ratings.
              </p>
          }
          </div>

          <div>
            {reviews.isLoading ?
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div> :
          !reviews.data || reviews.data.items.length === 0 ?
          <EmptyState compact icon={MessageSquareQuoteIcon} title="No reviews yet" description="Patients can review after each completed visit." /> :

          <ul className="divide-y divide-line">
                {reviews.data.items.map((r) =>
            <li key={r.id} className={cn('py-3 first:pt-0 last:pb-0', r.status !== 'ACTIVE' && 'opacity-90')}>
                    <div className="flex flex-wrap items-center gap-2">
                      <RatingStars rating={r.rating} />
                      {r.status === 'FLAGGED' &&
                <span className="inline-flex items-center gap-1 rounded bg-warning-soft px-1.5 py-px text-[10.5px] font-medium text-warning">
                          <FlagIcon className="h-2.5 w-2.5" aria-hidden />
                          Flagged · hidden from public
                        </span>
                }
                      {r.status === 'HIDDEN' &&
                <span className="inline-flex items-center gap-1 rounded bg-subtle px-1.5 py-px text-[10.5px] font-medium text-ink-2">
                          <EyeOffIcon className="h-2.5 w-2.5" aria-hidden />
                          Hidden
                        </span>
                }
                      <span className="ml-auto text-[11.5px] text-ink-3">{formatRelative(r.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink">{r.comment ? `“${r.comment}”` : <span className="text-ink-3">No written comment</span>}</p>
                    <p className="mt-1 text-[12px] text-ink-3">Nurse <span className="num font-mono">{shortId(r.nurseId)}</span></p>
                  </li>
            )}
              </ul>
          }
          </div>
        </div>
      }
    </Card>);

}

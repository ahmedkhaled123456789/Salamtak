import { Link } from 'react-router-dom';
import { ArrowRightIcon, CircleCheckIcon, InfoIcon, OctagonAlertIcon, TriangleAlertIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ErrorState } from '../ui/ErrorState';
import { useAttention } from '../../hooks/useAttention';
import type { AttentionItem } from '../../hooks/useAttention';
import { cn } from '../../utils/cn';

const severityStyles: Record<AttentionItem['severity'], {icon: typeof InfoIcon;wrap: string;count: string;label: string;}> = {
  critical: { icon: OctagonAlertIcon, wrap: 'bg-danger-soft text-danger ring-danger/15', count: 'text-danger', label: 'Critical' },
  warning: { icon: TriangleAlertIcon, wrap: 'bg-warning-soft text-warning ring-warning/20', count: 'text-ink', label: 'Warning' },
  info: { icon: InfoIcon, wrap: 'bg-info-soft text-info ring-info/15', count: 'text-ink', label: 'Info' }
};

export function AttentionCenter({ className }: {className?: string;}) {
  const { items, isLoading, isError, partialFailure, refetch } = useAttention();
  const critical = items.filter((i) => i.severity === 'critical').length;

  return (
    <Card
      className={className}
      title="Needs Attention"
      description={!isLoading && !isError ? `${items.length} open item${items.length === 1 ? '' : 's'}${critical ? ` · ${critical} critical` : ''}` : 'Open items across the marketplace'}
      flush>

      {isError ?
      <ErrorState compact onRetry={refetch} description="We couldn't load open items." /> :
      isLoading ?
      <div className="space-y-px px-5 pb-4">
          {Array.from({ length: 5 }).map((_, i) =>
        <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-3 flex-1" />
              <Skeleton className="h-3 w-14" />
            </div>
        )}
        </div> :
      items.length === 0 ?
      <EmptyState compact icon={CircleCheckIcon} title="Nothing needs attention" description={partialFailure ? "Some checks couldn't be loaded, so this list may be incomplete." : 'Verifications, emergencies and finance operations are all clear.'} /> :

      <>
          <ul className="divide-y divide-line border-t border-line">
            {items.map((item) => {
            const s = severityStyles[item.severity];
            return (
              <li key={item.id}>
                  <Link to={item.to} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-subtle/60">
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset', s.wrap)} aria-label={s.label}>
                      <s.icon className="h-4 w-4" strokeWidth={1.9} />
                    </span>
                    <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-2">
                      <span className={cn('num mr-1 text-[15px] font-semibold', s.count)}>{item.count}</span>
                      {item.label}
                    </p>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-brand opacity-80 transition-opacity group-hover:opacity-100">
                      {item.action}
                      <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </Link>
                </li>);

          })}
          </ul>
          {partialFailure && <p className="border-t border-line px-5 py-2.5 text-[11.5px] text-ink-3">Some checks couldn't be loaded, so this list may be incomplete.</p>}
        </>
      }
    </Card>);

}

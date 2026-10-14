import { cn } from '../../utils/cn';
import { formatDateTime } from '../../utils/date';
import { toneDot } from './StatusBadge';
import type { TimelineEvent } from '../../types/domain';

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

export function Timeline({ events, className }: TimelineProps) {
  return (
    <ol className={cn('relative', className)}>
      {events.map((event, index) => {
        const last = index === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className="absolute left-[5px] top-4 h-[calc(100%-12px)] w-px bg-line" aria-hidden />}
            <span className="relative mt-[5px] flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-line">
              <span className={cn('h-[5px] w-[5px] rounded-full', toneDot[event.tone ?? 'neutral'])} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-[13px] font-medium text-ink">{event.title}</p>
                <time className="num text-[11.5px] text-ink-3" dateTime={event.at}>
                  {formatDateTime(event.at)}
                </time>
              </div>
              {(event.actor || event.description) &&
              <p className="mt-0.5 text-[12px] text-ink-3">
                  {event.actor}
                  {event.actor && event.description && ' · '}
                  {event.description}
                </p>
              }
            </div>
          </li>);

      })}
    </ol>);

}
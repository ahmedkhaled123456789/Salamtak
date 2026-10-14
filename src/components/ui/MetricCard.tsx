import React from 'react';
import { Skeleton } from './Skeleton';
import { cn } from '../../utils/cn';
import type { Tone } from '../../types/domain';

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  caption?: React.ReactNode;
  status?: {label: string;tone: Tone;};
  progress?: number;
  progressMarker?: number;
  visual?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

const statusText: Record<Tone, string> = {
  neutral: 'text-ink-3',
  brand: 'text-brand',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger'
};

const statusDot: Record<Tone, string> = {
  neutral: 'bg-ink-3',
  brand: 'bg-brand',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger'
};

/** Operational metric: compact, designed to sit in a divided strip rather than a standalone card. */
export function MetricCard({ label, value, unit, caption, status, progress, progressMarker, visual, loading = false, className }: MetricCardProps) {
  return (
    <div className={cn('flex min-w-0 flex-col px-5 py-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-ink-2">{label}</span>
        {status && !loading &&
        <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', statusText[status.tone])}>
            <span className={cn('h-1.5 w-1.5 rounded-full', statusDot[status.tone])} aria-hidden />
            {status.label}
          </span>
        }
      </div>
      {loading ?
      <>
          <Skeleton className="mt-3 h-7 w-20" />
          <Skeleton className="mt-3 h-1.5 w-full" />
        </> :

      <>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="num text-[24px] font-semibold leading-none tracking-[-0.02em] text-ink">
              {value}
              {unit && <span className="ml-0.5 text-[15px] font-medium text-ink-3">{unit}</span>}
            </div>
            {visual}
          </div>
          {progress !== undefined &&
        <div className="relative mt-3 h-1.5 w-full rounded-full bg-subtle" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(progress, 100)}%` }} />
              {progressMarker !== undefined &&
          <span className="absolute -top-0.5 h-2.5 w-px bg-ink-2" style={{ left: `${progressMarker}%` }} aria-hidden />
          }
            </div>
        }
          {caption && <p className="mt-2 text-[11.5px] text-ink-3">{caption}</p>}
        </>
      }
    </div>);

}
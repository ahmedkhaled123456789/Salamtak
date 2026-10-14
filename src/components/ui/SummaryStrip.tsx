import React from 'react';
import { Skeleton } from './Skeleton';
import { cn } from '../../utils/cn';
import type { Tone } from '../../types/domain';

export interface SummaryItem {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  onClick?: () => void;
  active?: boolean;
}

interface SummaryStripProps {
  items: SummaryItem[];
  loading?: boolean;
  className?: string;
}

const toneBar: Record<Tone, string> = {
  neutral: 'bg-ink-3/40',
  brand: 'bg-brand',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger'
};

/** A single bordered strip of compact figures, divided rather than boxed. */
export function SummaryStrip({ items, loading = false, className }: SummaryStripProps) {
  const cols: Record<number, string> = {
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6'
  };
  return (
    <div
      className={cn(
        'grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface shadow-card sm:grid-cols-3',
        cols[items.length] ?? 'lg:grid-cols-4',
        className
      )}>
      
      {items.map((item) => {
        const Comp = item.onClick ? 'button' : 'div';
        return (
          <Comp
            key={item.label}
            type={item.onClick ? 'button' : undefined}
            onClick={item.onClick}
            aria-pressed={item.onClick ? item.active : undefined}
            className={cn(
              'relative -mb-px -mr-px border-b border-r border-line px-4 py-3.5 text-left',
              item.onClick && 'transition-colors hover:bg-subtle/60',
              item.active && 'bg-subtle/70'
            )}>
            
            <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink-2">
              {item.tone && <span className={cn('h-1.5 w-1.5 rounded-full', toneBar[item.tone])} aria-hidden />}
              {item.label}
            </div>
            {loading ?
            <Skeleton className="mt-2 h-6 w-20" /> :

            <div className="num mt-1 text-[19px] font-semibold tracking-[-0.02em] text-ink">{item.value}</div>
            }
            {item.hint && !loading && <div className="mt-0.5 text-[11.5px] text-ink-3">{item.hint}</div>}
            {item.active && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-brand" aria-hidden />}
          </Comp>);

      })}
    </div>);

}
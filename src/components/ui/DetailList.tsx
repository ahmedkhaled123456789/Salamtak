import React from 'react';
import { cn } from '../../utils/cn';

export interface DetailItem {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

interface DetailListProps {
  items: DetailItem[];
  columns?: 1 | 2;
  className?: string;
}

export function DetailList({ items, columns = 1, className }: DetailListProps) {
  return (
    <dl className={cn('grid gap-x-6', columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1', className)}>
      {items.map((item) =>
      <div key={item.label} className="flex items-start justify-between gap-4 border-b border-dashed border-line py-2.5 last:border-0 sm:[&:nth-last-child(2)]:border-0">
          <dt className="shrink-0 text-[12.5px] text-ink-3">{item.label}</dt>
          <dd className={cn('min-w-0 text-right text-[13px] font-medium text-ink', item.mono && 'num break-all font-mono text-[12px]')}>{item.value}</dd>
        </div>
      )}
    </dl>);

}
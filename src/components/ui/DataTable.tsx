import React from 'react';
import { Skeleton } from './Skeleton';
import { cn } from '../../utils/cn';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows?: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  skeletonRows?: number;
  empty?: React.ReactNode;
  mobileRow?: (row: T) => React.ReactNode;
  selectedId?: string | null;
  minWidth?: number;
  caption?: string;
  rowClassName?: (row: T) => string | undefined;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  loading = false,
  skeletonRows = 6,
  empty,
  mobileRow,
  selectedId,
  minWidth = 760,
  caption,
  rowClassName
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading table">
        <div className="flex h-9 items-center gap-6 border-y border-line bg-subtle/50 px-5">
          {columns.slice(0, 5).map((c) =>
          <Skeleton key={c.key} className="h-2.5 w-16" />
          )}
        </div>
        {Array.from({ length: skeletonRows }).map((_, i) =>
        <div key={i} className="flex h-[52px] items-center gap-6 border-b border-line px-5 last:border-0">
            <Skeleton className="h-3 w-20" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="hidden h-3 w-24 md:block" />
            <Skeleton className="hidden h-3 w-20 lg:block" />
            <Skeleton className="ml-auto h-5 w-16 rounded-md" />
          </div>
        )}
      </div>);

  }

  if (!rows || rows.length === 0) return <>{empty}</>;

  return (
    <>
      <div className={cn('overflow-x-auto', mobileRow && 'hidden md:block')}>
        <table className="w-full border-collapse text-left text-[13px]" style={{ minWidth }}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-y border-line bg-subtle/50">
              {columns.map((c) =>
              <th
                key={c.key}
                scope="col"
                style={{ width: c.width }}
                className={cn(
                  'h-9 whitespace-nowrap px-4 text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3 first:pl-5 last:pr-5',
                  c.align === 'right' && 'text-right'
                )}>
                
                  {c.header}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = getRowId(row);
              return (
                <tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                  onRowClick ?
                  (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick(row);
                    }
                  } :
                  undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  className={cn(
                    'group border-b border-line transition-colors duration-100 last:border-0',
                    onRowClick && 'cursor-pointer hover:bg-subtle/60 focus-visible:bg-subtle focus-visible:outline-none',
                    selectedId === id && 'bg-brand-soft/60 hover:bg-brand-soft/60',
                    rowClassName?.(row)
                  )}>
                  
                  {columns.map((c) =>
                  <td
                    key={c.key}
                    className={cn(
                      'h-[52px] whitespace-nowrap px-4 align-middle text-ink first:pl-5 last:pr-5',
                      c.align === 'right' && 'text-right',
                      c.className
                    )}>
                    
                      {c.cell(row)}
                    </td>
                  )}
                </tr>);

            })}
          </tbody>
        </table>
      </div>
      {mobileRow &&
      <ul className="divide-y divide-line border-t border-line md:hidden">
          {rows.map((row) =>
        <li key={getRowId(row)}>
              {onRowClick ?
          <button type="button" onClick={() => onRowClick(row)} className="w-full px-4 py-3.5 text-left transition-colors hover:bg-subtle/60">
                  {mobileRow(row)}
                </button> :

          <div className="px-4 py-3.5">{mobileRow(row)}</div>
          }
            </li>
        )}
        </ul>
      }
    </>);

}
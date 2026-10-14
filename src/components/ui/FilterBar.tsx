import React from 'react';
import { XIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface FilterBarProps {
  children: React.ReactNode;
  actions?: React.ReactNode;
  activeCount?: number;
  onClear?: () => void;
  className?: string;
}

export function FilterBar({ children, actions, activeCount = 0, onClear, className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-2 px-5 py-3 lg:flex-row lg:items-center', className)}>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {children}
        {activeCount > 0 && onClear &&
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-ink-3 transition-colors hover:bg-subtle hover:text-ink">
          
            <XIcon className="h-3.5 w-3.5" />
            Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
          </button>
        }
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>);

}
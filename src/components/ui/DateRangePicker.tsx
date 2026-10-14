import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { CalendarIcon, CheckIcon, ChevronDownIcon } from 'lucide-react';
import { Dropdown } from './Dropdown';
import { Button } from './Button';
import { cn } from '../../utils/cn';

export interface DateRangeValue {
  preset: string;
  from?: string;
  to?: string;
}

const presets = [
{ value: 'all', label: 'All time' },
{ value: 'today', label: 'Today' },
{ value: 'yesterday', label: 'Yesterday' },
{ value: '7d', label: 'Last 7 days' },
{ value: '30d', label: 'Last 30 days' },
{ value: 'mtd', label: 'Month to date' },
{ value: 'qtd', label: 'Quarter to date' },
{ value: '12m', label: 'Last 12 months' }];


interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
}

export function labelForRange(value: DateRangeValue): string {
  if (value.preset === 'custom' && value.from && value.to) return `${value.from} → ${value.to}`;
  return presets.find((p) => p.value === value.preset)?.label ?? 'Custom range';
}

export function DateRangePicker({ value, onChange, align = 'left', size = 'sm' }: DateRangePickerProps) {
  const [from, setFrom] = useState(value.from ?? format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [to, setTo] = useState(value.to ?? format(new Date(), 'yyyy-MM-dd'));

  return (
    <Dropdown
      align={align}
      widthClassName="w-64"
      ariaLabel="Select date range"
      triggerClassName={cn(
        'inline-flex items-center gap-2 rounded-md border border-line bg-surface font-medium text-ink shadow-xs transition-colors hover:border-line-strong',
        size === 'sm' ? 'h-8 px-2.5 text-[12.5px]' : 'h-9 px-3 text-[13px]'
      )}
      trigger={
      <>
          <CalendarIcon className="h-3.5 w-3.5 text-ink-3" aria-hidden />
          {labelForRange(value)}
          <ChevronDownIcon className="h-3.5 w-3.5 text-ink-3" aria-hidden />
        </>
      }>
      
      {(close) =>
      <div>
          {presets.map((p) =>
        <button
          key={p.value}
          type="button"
          role="menuitemradio"
          aria-checked={value.preset === p.value}
          onClick={() => {
            onChange({ preset: p.value });
            close();
          }}
          className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] text-ink hover:bg-subtle">
          
              {p.label}
              {value.preset === p.value && <CheckIcon className="h-3.5 w-3.5 text-brand" aria-hidden />}
            </button>
        )}
          <div className="-mx-1 my-1 h-px bg-line" />
          <div className="px-2.5 pb-1.5 pt-1">
            <p className="mb-2 text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-3">Custom range</p>
            <div className="grid grid-cols-2 gap-2">
              <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From date"
              className="h-8 rounded-md border border-line bg-surface px-2 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-brand/15" />
            
              <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="To date"
              className="h-8 rounded-md border border-line bg-surface px-2 text-[12px] text-ink focus:outline-none focus:ring-2 focus:ring-brand/15" />
            
            </div>
            <Button
            size="sm"
            variant="primary"
            className="mt-2 w-full"
            onClick={() => {
              onChange({ preset: 'custom', from, to });
              close();
            }}>
            
              Apply range
            </Button>
          </div>
        </div>
      }
    </Dropdown>);

}
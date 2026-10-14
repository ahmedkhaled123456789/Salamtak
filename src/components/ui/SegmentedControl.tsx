import { useId } from 'react';
import { m } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  count?: number;
}

interface SegmentedControlProps<V extends string> {
  options: SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  variant?: 'pill' | 'underline';
  ariaLabel: string;
  className?: string;
}

export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  variant = 'pill',
  ariaLabel,
  className
}: SegmentedControlProps<V>) {
  const id = useId();

  if (variant === 'underline') {
    return (
      <div role="tablist" aria-label={ariaLabel} className={cn('flex gap-1 overflow-x-auto border-b border-line px-5', className)}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onChange(o.value)}
              className={cn(
                'relative flex h-10 shrink-0 items-center gap-1.5 px-2.5 text-[13px] font-medium transition-colors',
                active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
              )}>
              
              {o.label}
              {o.count !== undefined &&
              <span className={cn('num rounded px-1.5 text-[11px] leading-[18px]', active ? 'bg-brand-soft text-brand' : 'bg-subtle text-ink-3')}>
                  {o.count}
                </span>
              }
              {active && <m.span layoutId={`${id}-underline`} className="absolute inset-x-1 -bottom-px h-[2px] rounded-full bg-brand" />}
            </button>);

        })}
      </div>);

  }

  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('inline-flex rounded-lg bg-subtle p-0.5 ring-1 ring-inset ring-line/70', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative h-7 rounded-md px-2.5 text-[12px] font-medium transition-colors',
              active ? 'text-ink' : 'text-ink-3 hover:text-ink-2'
            )}>
            
            {active &&
            <m.span
              layoutId={`${id}-pill`}
              className="absolute inset-0 rounded-md bg-surface shadow-xs ring-1 ring-line"
              transition={{ type: 'spring', stiffness: 500, damping: 38 }} />

            }
            <span className="num relative">{o.label}</span>
          </button>);

      })}
    </div>);

}
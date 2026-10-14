import { ChevronDownIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
}

/** Compact filter select: "Label: Value ▾". Uses a native select for accessibility. */
export function Select({ label, value, onChange, options, className }: SelectProps) {
  const isActive = value !== 'all' && value !== '';
  return (
    <label
      className={cn(
        'relative inline-flex h-8 items-center rounded-md border bg-surface text-[12.5px] shadow-xs transition-colors focus-within:ring-2 focus-within:ring-brand/15',
        isActive ? 'border-brand/30 bg-brand-soft/50' : 'border-line hover:border-line-strong',
        className
      )}>
      
      <span className="pl-2.5 text-ink-3">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full cursor-pointer appearance-none bg-transparent pl-1 pr-7 font-medium text-ink focus:outline-none">
        
        {options.map((o) =>
        <option key={o.value} value={o.value}>
            {o.label}
          </option>
        )}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink-3" aria-hidden />
    </label>);

}
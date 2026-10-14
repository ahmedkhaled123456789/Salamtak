import { SearchIcon, XIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className, ariaLabel }: SearchInputProps) {
  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-8 w-full rounded-md border border-line bg-surface pl-8 pr-7 text-[13px] text-ink shadow-xs placeholder:text-ink-3 focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15 [&::-webkit-search-cancel-button]:hidden" />
      
      {value &&
      <button
        type="button"
        aria-label="Clear search"
        onClick={() => onChange('')}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-3 hover:text-ink">
        
          <XIcon className="h-3.5 w-3.5" />
        </button>
      }
    </div>);

}
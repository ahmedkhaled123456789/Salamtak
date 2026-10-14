import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: React.ReactNode;
  error?: string;
  prefix?: string;
  suffix?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
{ label, hint, error, prefix, suffix, className, id, ...rest },
ref)
{
  const inputId = id ?? rest.name;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
        {label}
      </label>
      <div
        className={cn(
          'flex h-9 items-center rounded-md border bg-surface shadow-xs transition-colors focus-within:ring-2',
          error ? 'border-danger/50 focus-within:ring-danger/15' : 'border-line focus-within:border-brand/40 focus-within:ring-brand/15',
          rest.disabled && 'bg-subtle'
        )}>
        
        {prefix && <span className="pl-3 text-[13px] text-ink-3">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className="num h-full w-full min-w-0 bg-transparent px-3 text-[13px] text-ink placeholder:text-ink-3 focus:outline-none disabled:cursor-not-allowed disabled:text-ink-3"
          {...rest} />
        
        {suffix && <span className="pr-3 text-[13px] text-ink-3">{suffix}</span>}
      </div>
      {error ?
      <p className="mt-1 text-[11.5px] text-danger">{error}</p> :

      hint && <p className="mt-1 text-[11.5px] text-ink-3">{hint}</p>
      }
    </div>);

});
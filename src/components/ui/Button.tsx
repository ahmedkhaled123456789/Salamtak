import React, { forwardRef } from 'react';
import { LoaderCircleIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'icon' | 'icon-sm';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-ink shadow-xs hover:bg-brand/90',
  secondary: 'border border-line bg-surface text-ink shadow-xs hover:border-line-strong hover:bg-subtle',
  ghost: 'text-ink-2 hover:bg-subtle hover:text-ink',
  danger: 'border border-line bg-surface text-danger shadow-xs hover:border-danger/30 hover:bg-danger-soft',
  success: 'border border-success/25 bg-success-soft text-success hover:bg-success/15'
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-[13px]',
  md: 'h-9 gap-2 px-3.5 text-[13px]',
  icon: 'h-9 w-9',
  'icon-sm': 'h-8 w-8'
};

export function buttonClasses(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
{ variant = 'secondary', size = 'md', loading = false, icon, className, children, disabled, type = 'button', ...rest },
ref)
{
  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClasses(variant, size, className)} {...rest}>
      {loading ? <LoaderCircleIcon className="h-3.5 w-3.5 animate-spin" aria-hidden /> : icon}
      {children}
    </button>);

});
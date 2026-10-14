import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  flush?: boolean;
  id?: string;
}

export function Card({ title, description, actions, children, footer, className, bodyClassName, flush = false, id }: CardProps) {
  const hasHeader = Boolean(title || actions);
  return (
    <section id={id} className={cn('flex min-w-0 flex-col rounded-xl border border-line bg-surface shadow-card', className)}>
      {hasHeader &&
      <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0">
            {title && <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-[12.5px] text-ink-3">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      }
      <div className={cn('flex-1', flush ? '' : 'px-5 pb-5', !hasHeader && !flush && 'pt-5', bodyClassName)}>{children}</div>
      {footer && <footer className="border-t border-line px-5 py-3">{footer}</footer>}
    </section>);

}
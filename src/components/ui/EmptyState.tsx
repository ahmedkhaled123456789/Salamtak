import React from "react";
import { cn } from "../../utils/cn";
import type { LucideIcon } from "lucide-react";
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false
}: EmptyStateProps) {
  return <div className={cn('flex flex-col items-center justify-center px-6 text-center', compact ? 'py-8' : 'py-16', className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 -m-2 rounded-xl border border-dashed border-line" aria-hidden />
        <div className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface shadow-xs">
          <Icon className="h-5 w-5 text-ink-3" strokeWidth={1.75} aria-hidden />
        </div>
      </div>
      <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-3">{description}</p>
      {action && <div className="mt-5 flex items-center gap-2">{action}</div>}
    </div>;
}
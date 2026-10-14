import React from "react";
import { Link } from "react-router-dom";
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "./Skeleton";
import { Sparkline } from "./Sparkline";
import { cn } from "../../utils/cn";
export interface Delta {
  value: string;
  trend: 'up' | 'down' | 'flat';
  positive?: boolean;
}
interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  delta?: Delta;
  hint?: React.ReactNode;
  variant?: 'default' | 'feature' | 'attention';
  sparkline?: number[];
  action?: {
    label: string;
    to: string;
  };
  aside?: React.ReactNode;
  loading?: boolean;
  className?: string;
}
export function DeltaPill({
  delta


}: {delta: Delta;}) {
  const Icon = delta.trend === 'down' ? ArrowDownRightIcon : ArrowUpRightIcon;
  const good = delta.positive ?? delta.trend === 'up';
  return <span className={cn('num inline-flex items-center gap-0.5 rounded px-1 py-px text-[12px] font-medium', delta.trend === 'flat' ? 'text-ink-3' : good ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger')}>
      {delta.trend !== 'flat' && <Icon className="h-3 w-3" strokeWidth={2.25} aria-hidden />}
      {delta.value}
    </span>;
}
export function StatCard({
  label,
  value,
  icon: Icon,
  delta,
  hint,
  variant = 'default',
  sparkline,
  action,
  aside,
  loading = false,
  className
}: StatCardProps) {
  const feature = variant === 'feature';
  const attention = variant === 'attention';
  return <div className={cn('relative flex min-w-0 overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-card', attention && 'border-warning/25', className)}>
      {attention && <span className="absolute inset-y-0 left-0 w-[3px] bg-warning" aria-hidden />}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
          {Icon && <Icon className={cn('h-3.5 w-3.5', attention ? 'text-warning' : 'text-ink-3')} strokeWidth={2} aria-hidden />}
          {label}
        </div>
        {loading ? <>
            <Skeleton className={cn('mt-3', feature ? 'h-9 w-48' : 'h-7 w-24')} />
            <Skeleton className="mt-3 h-3 w-32" />
          </> : <>
            <div className={cn('num mt-2 font-semibold tracking-[-0.025em] text-ink', feature ? 'text-[34px] leading-[40px]' : 'text-[26px] leading-[32px]')}>
              {value}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
              {delta && <DeltaPill delta={delta} />}
              {hint && <span className={cn(attention && 'font-medium text-warning')}>{hint}</span>}
            </div>
            {action && <Link to={action.to} className="mt-auto inline-flex items-center gap-1 pt-3 text-[12.5px] font-medium text-brand hover:underline">
                {action.label}
                <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
              </Link>}
          </>}
      </div>
      {feature && sparkline && !loading && <div className="ml-6 hidden w-[42%] max-w-[260px] flex-col justify-end sm:flex">
          <Sparkline data={sparkline} height={64} />
          <div className="mt-1.5 flex justify-between text-[10.5px] text-ink-3">
            <span>Nov</span>
            <span>Oct</span>
          </div>
        </div>}
      {aside && !loading && <div className="ml-6 hidden items-center sm:flex">{aside}</div>}
    </div>;
}
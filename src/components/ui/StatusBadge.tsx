import { cn } from '../../utils/cn';
import type { Tone } from '../../types/domain';

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-subtle text-ink-2 ring-line',
  brand: 'bg-brand-soft text-brand ring-brand/15',
  info: 'bg-info-soft text-info ring-info/15',
  success: 'bg-success-soft text-success ring-success/20',
  warning: 'bg-warning-soft text-warning ring-warning/20',
  danger: 'bg-danger-soft text-danger ring-danger/20'
};

export const toneDot: Record<Tone, string> = {
  neutral: 'bg-ink-3',
  brand: 'bg-brand',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger'
};

const statusTones: Record<string, Tone> = {
  pending: 'warning',
  confirmed: 'info',
  in_progress: 'brand',
  completed: 'success',
  cancelled: 'neutral',
  disputed: 'danger',
  refunded: 'neutral',
  paid: 'success',
  processing: 'info',
  failed: 'danger',
  partially_refunded: 'warning',
  requested: 'warning',
  succeeded: 'success',
  verified: 'success',
  rejected: 'danger',
  expired: 'neutral',
  active: 'success',
  inactive: 'neutral',
  suspended: 'danger',
  frozen: 'info',
  awaiting: 'warning',
  approved: 'success',
  published: 'success',
  flagged: 'warning',
  hidden: 'neutral',
  scheduled: 'info',
  paused: 'neutral',
  waiting: 'danger',
  matching: 'warning',
  accepted: 'info',
  healthy: 'success',
  degraded: 'warning',
  critical: 'danger',
  received: 'success',
  invited: 'neutral',
  issues: 'warning',
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
  /* backend enums (compared lower-cased) */
  payment_pending: 'warning',
  nurse_pending: 'warning',
  nurse_accepted: 'info',
  nurse_rejected: 'danger',
  care_started: 'brand',
  care_in_progress: 'brand',
  refund_pending: 'warning',
  under_review: 'info',
  provider_succeeded: 'info',
  provider_paid: 'info',
  applied: 'success',
  open: 'warning',
  resolved: 'success',
  information: 'info',
  warning: 'warning',
  nurse_offered: 'info',
  none: 'neutral',
  duplicate_refund: 'warning',
  late_refund: 'warning'
};

const labels: Record<string, string> = {
  in_progress: 'In Progress',
  partially_refunded: 'Partially Refunded',
  awaiting: 'Awaiting approval',
  issues: 'Discrepancies'
};

export function toneForStatus(status: string): Tone {
  return statusTones[status.toLowerCase()] ?? 'neutral';
}

/** "NURSE_PENDING" / "nurse_pending" -> "Nurse pending". Works for backend enums and the UI's own keys. */
export function labelForStatus(status: string): string {
  const key = status.toLowerCase();
  return labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

interface StatusBadgeProps {
  status?: string;
  label?: string;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({ status = '', label, tone, dot = true, className }: StatusBadgeProps) {
  const resolvedTone = tone ?? toneForStatus(status);
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-[11.5px] font-medium ring-1 ring-inset',
        toneStyles[resolvedTone],
        className
      )}>
      
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', toneDot[resolvedTone])} aria-hidden />}
      {label ?? labelForStatus(status)}
    </span>);

}
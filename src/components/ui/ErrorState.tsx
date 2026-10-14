import { RotateCwIcon, TriangleAlertIcon } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  description = "We couldn't load this data. Your connection is fine — the service may be temporarily unavailable.",
  onRetry,
  className,
  compact = false
}: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-6 text-center', compact ? 'py-8' : 'py-16', className)}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-danger-soft ring-1 ring-inset ring-danger/15">
        <TriangleAlertIcon className="h-5 w-5 text-danger" strokeWidth={1.75} aria-hidden />
      </div>
      <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-3">{description}</p>
      {onRetry &&
      <Button className="mt-5" size="sm" onClick={onRetry} icon={<RotateCwIcon className="h-3.5 w-3.5" />}>
          Try again
        </Button>
      }
    </div>);

}
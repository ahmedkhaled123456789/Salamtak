import { LockIcon } from 'lucide-react';
import { describeLoadError, normalizeError } from '../../api/errors';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

interface ApiErrorStateProps {
  error: unknown;
  /** What failed to load, in plain words: "bookings", "the verification queue". */
  what: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

/**
 * Failed-load view. A 403 is shown as "permission denied" (retrying cannot help, so no retry button);
 * everything else gets a safe, normalised message and a retry.
 */
export function ApiErrorState({ error, what, onRetry, compact, className }: ApiErrorStateProps) {
  const { title, description } = describeLoadError(error, what);
  if (normalizeError(error).isForbidden) {
    return <EmptyState compact={compact} className={className} icon={LockIcon} title={title} description={description} />;
  }
  return <ErrorState compact={compact} className={className} title={title} description={description} onRetry={onRetry} />;
}

import { PlugIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface UnavailableProps {
  title: string;
  /** Say plainly what the backend doesn't provide. Nothing here is simulated. */
  description: string;
  icon?: LucideIcon;
  compact?: boolean;
  className?: string;
  action?: React.ReactNode;
}

/** Honest placeholder for data the backend doesn't expose yet — never filled with sample numbers. */
export function Unavailable({ title, description, icon = PlugIcon, compact = true, className, action }: UnavailableProps) {
  return <EmptyState compact={compact} className={className} icon={icon} title={title} description={description} action={action} />;
}

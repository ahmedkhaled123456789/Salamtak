import { format, formatDistanceStrict, isSameDay, isValid } from 'date-fns';

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isValid(d) ? d : null;
}

const PLACEHOLDER = '—';

export function formatDate(iso: string | null | undefined): string {
  const d = parse(iso);
  return d ? format(d, 'MMM d, yyyy') : PLACEHOLDER;
}

export function formatShortDate(iso: string | null | undefined): string {
  const d = parse(iso);
  return d ? format(d, 'MMM d') : PLACEHOLDER;
}

export function formatDateTime(iso: string | null | undefined): string {
  const d = parse(iso);
  return d ? format(d, 'MMM d, h:mm a') : PLACEHOLDER;
}

export function formatTime(iso: string | null | undefined): string {
  const d = parse(iso);
  return d ? format(d, 'h:mm a') : PLACEHOLDER;
}

export function formatRelative(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return PLACEHOLDER;
  const diff = Date.now() - d.getTime();
  if (Math.abs(diff) < 60_000) return 'just now';
  return formatDistanceStrict(d, new Date(), { addSuffix: true });
}

export function formatSmartDate(iso: string | null | undefined): string {
  const d = parse(iso);
  if (!d) return PLACEHOLDER;
  if (isSameDay(d, new Date())) return `Today, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

export function minutesUntil(iso: string): number {
  const d = parse(iso);
  return d ? Math.round((d.getTime() - Date.now()) / 60_000) : 0;
}

export function formatCountdown(iso: string): string {
  const minutes = minutesUntil(iso);
  if (minutes <= 0) return minutes > -60 ? `Started ${Math.abs(minutes)} min ago` : 'Started';
  if (minutes < 60) return `Starts in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `Starts in ${hours}h ${rest}m`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ${seconds % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${h}h ${rest}m` : `${h}h`;
}

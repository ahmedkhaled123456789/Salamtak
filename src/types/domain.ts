/**
 * UI-only shared types. API data shapes live in src/api/types.ts (they mirror the backend);
 * nothing here describes business data.
 */
export type Tone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger';

export interface TimelineEvent {
  id: string;
  title: string;
  at: string;
  tone?: Tone;
  actor?: string;
  description?: string;
}

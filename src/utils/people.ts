import type { NurseProfile } from '../api/types';

export function nurseName(n: Pick<NurseProfile, 'user'>): string {
  const name = n.user ? `${n.user.firstName} ${n.user.lastName}`.trim() : '';
  return name || 'Unnamed nurse';
}

/** Short, recognisable form of a database id for tables where no name is available (…a1b2c3). */
export function shortId(id: string | null | undefined): string {
  if (!id) return '—';
  return id.length > 8 ? `…${id.slice(-6)}` : id;
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

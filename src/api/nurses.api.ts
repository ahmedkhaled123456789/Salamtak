import { get, patch } from './client';
import { toNurseProfile } from './normalize';
import type { NurseListQuery, NurseProfile, Page } from './types';

export async function listNurses(query: NurseListQuery): Promise<Page<NurseProfile>> {
  const page = await get<Page<Record<string, unknown>>>('/admin/nurses', { ...query });
  return { meta: page.meta, items: page.items.map(toNurseProfile) };
}

export const suspendNurse = (id: string, reason: string) =>
  patch<Record<string, unknown>>(`/admin/nurses/${id}/suspend`, { reason }).then(toNurseProfile);

export const reactivateNurse = (id: string) => patch<Record<string, unknown>>(`/admin/nurses/${id}/reactivate`).then(toNurseProfile);

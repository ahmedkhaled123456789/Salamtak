import { get, post } from './client';
import { toEmergencyRequest } from './normalize';
import type { EmergencyDetail, EmergencyListQuery, EmergencyOffer, EmergencyRequest, Page } from './types';

export async function listEmergencyRequests(query: EmergencyListQuery): Promise<Page<EmergencyRequest>> {
  const page = await get<Page<Record<string, unknown>>>('/admin/emergency-requests', { ...query });
  return { meta: page.meta, items: page.items.map(toEmergencyRequest) };
}

export async function getEmergencyRequest(id: string): Promise<EmergencyDetail> {
  const res = await get<{ request: Record<string, unknown>; patientName: string | null; offers: EmergencyOffer[] }>(`/admin/emergency-requests/${id}`);
  return { request: toEmergencyRequest(res.request), patientName: res.patientName, offers: res.offers };
}

type Changed = { id: string; status: string; changed: boolean };
export const cancelEmergencyRequest = (id: string, reason: string) => post<Changed>(`/admin/emergency-requests/${id}/cancel`, { reason });
export const reopenEmergencyRequest = (id: string) => post<Changed>(`/admin/emergency-requests/${id}/reopen`);

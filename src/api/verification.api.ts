import { get, post } from './client';
import { toNurseProfile } from './normalize';
import type { DocumentListQuery, FileAccessUrl, NurseDocument, NurseProfile, NurseVerificationDetail, Page } from './types';

export const listDocuments = (query: DocumentListQuery) => get<Page<NurseDocument>>('/admin/nurse-documents', { ...query });

export async function getVerificationDetail(nurseId: string): Promise<NurseVerificationDetail> {
  const res = await get<{ nurse: Record<string, unknown>; documents: NurseDocument[] }>(`/admin/nurses/${nurseId}/verification`);
  return { nurse: toNurseProfile(res.nurse), documents: res.documents };
}

export const approveDocument = (id: string) => post<NurseDocument>(`/admin/nurse-documents/${id}/approve`);
export const rejectDocument = (id: string, reason: string) => post<NurseDocument>(`/admin/nurse-documents/${id}/reject`, { reason });

type NurseDecision = { changed: boolean; nurse: NurseProfile };
const toDecision = (r: { changed: boolean; nurse: Record<string, unknown> }): NurseDecision => ({ changed: r.changed, nurse: toNurseProfile(r.nurse) });

export const approveNurse = (id: string) =>
  post<{ changed: boolean; nurse: Record<string, unknown> }>(`/admin/nurses/${id}/verification/approve`).then(toDecision);
export const rejectNurse = (id: string, reason: string) =>
  post<{ changed: boolean; nurse: Record<string, unknown> }>(`/admin/nurses/${id}/verification/reject`, { reason }).then(toDecision);

/** A fresh, short-lived (default ~2 min) signed URL, issued at click time. Never cache or log it. */
export const getFileAccessUrl = (fileId: string) => post<FileAccessUrl>(`/files/${fileId}/access-url`);

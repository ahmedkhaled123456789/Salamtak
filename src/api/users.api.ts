import { get, patch } from './client';
import { toAdminUser } from './normalize';
import type { AdminUser, Page, UserListQuery } from './types';

export async function listUsers(query: UserListQuery): Promise<Page<AdminUser>> {
  const page = await get<Page<Record<string, unknown>>>('/admin/users', { ...query });
  return { meta: page.meta, items: page.items.map(toAdminUser) };
}

/** ADMIN only. The backend refuses to block yourself or another admin account. */
export const setUserBlocked = (id: string, blocked: boolean, reason?: string) =>
  patch<Record<string, unknown>>(`/admin/users/${id}/block`, { blocked, reason }).then(toAdminUser);

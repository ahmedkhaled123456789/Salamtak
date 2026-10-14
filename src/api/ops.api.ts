import { get, post } from './client';
import { idOf, toAuditEntry } from './normalize';
import type {
  AuditEntry,
  AuditListQuery,
  Conversation,
  NotificationItem,
  NotificationListQuery,
  Page,
  PageQuery,
  PlatformSettings,
  QueueHealth,
  ServiceItem,
  ServiceListQuery,
} from './types';

/** Read-only background-queue snapshot (ADMIN + FINANCE_APPROVER). */
export const getQueueHealth = () => get<QueueHealth>('/admin/queues');

export async function listAuditLogs(query: AuditListQuery): Promise<Page<AuditEntry>> {
  const page = await get<Page<Record<string, unknown>>>('/admin/audit-logs', { ...query });
  return { meta: page.meta, items: page.items.map(toAuditEntry) };
}

/** ADMIN only (settings:manage). Displayed read-only. */
export const getSettings = () => get<PlatformSettings>('/admin/settings');

/** Lean documents (`_id`); the list does not include rates — those live behind the pricing endpoints. */
export async function listServices(query: ServiceListQuery): Promise<Page<ServiceItem>> {
  const page = await get<Page<Record<string, unknown>>>('/admin/services', { ...query });
  return {
    meta: page.meta,
    items: page.items.map((raw) => {
      const imageId = raw.imageId ? String(raw.imageId) : null;
      return { ...(raw as unknown as ServiceItem), id: idOf(raw), imageId, imageUrl: imageId ? `/api/v1/media/${imageId}` : null };
    })
  };
}

/** For an ADMIN this is the support-conversation inbox. Only metadata is shown; message bodies are never requested. */
export const listConversations = (query: PageQuery) => get<Page<Conversation>>('/conversations', { ...query });

/** The signed-in administrator's own notifications. */
export const listNotifications = (query: NotificationListQuery) => get<Page<NotificationItem>>('/notifications', { ...query });
export const getUnreadNotificationCount = () => get<{ unread: number }>('/notifications/unread-count');

export const markAllNotificationsRead = () => post<unknown>('/notifications/read-all');

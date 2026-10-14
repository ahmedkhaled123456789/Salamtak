import { get, post } from './client';
import type { ContactMessage, InboxCounts, NewsletterSubscriber, Page, PageQuery } from './types';

/** Contact-form messages and newsletter subscribers (ADMIN, permission `admin:inbox:manage`). */
export const listContactMessages = (query: PageQuery & { status?: ContactMessage['status'] }) =>
  get<Page<ContactMessage>>('/admin/contact-messages', { ...query });
export const handleContactMessage = (id: string, note?: string) =>
  post<ContactMessage>(`/admin/contact-messages/${id}/handle`, note ? { note } : {});
export const listSubscribers = (query: PageQuery & { status?: NewsletterSubscriber['status'] }) =>
  get<Page<NewsletterSubscriber>>('/admin/newsletter-subscribers', { ...query });
export const getInboxCounts = () => get<InboxCounts>('/admin/inbox/counts');

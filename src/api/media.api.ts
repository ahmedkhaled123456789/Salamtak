import { request } from './client';
import type { ServiceItem } from './types';

/** JPEG / PNG / WebP only — the backend checks the file's real bytes as well, this just gives an early message. */
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const upload = <T>(url: string, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return request<T>({ method: 'put', url, data: form });
};

/** Replaces the public service picture (permission `services:manage`); the old file is deleted by the API. */
export const uploadServiceImage = (serviceId: string, file: File) => upload<ServiceItem>(`/admin/services/${serviceId}/image`, file);

/** Replaces a user's profile photo — for nurses, the photo shown on the website and app (`admin:media:manage`). */
export const uploadUserAvatar = (userId: string, file: File) => upload<{ id: string; profileImageUrl?: string }>(`/admin/users/${userId}/avatar`, file);

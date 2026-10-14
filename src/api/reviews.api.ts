import { get, post } from './client';
import type { Page, Review, ReviewListQuery } from './types';

export const listReviews = (query: ReviewListQuery) => get<Page<Review>>('/admin/reviews', { ...query });

type Moderated = Review & { changed: boolean };
export const hideReview = (id: string, reason: string) => post<Moderated>(`/admin/reviews/${id}/hide`, { reason });
export const flagReview = (id: string, reason: string) => post<Moderated>(`/admin/reviews/${id}/flag`, { reason });
export const restoreReview = (id: string, reason?: string) => post<Moderated>(`/admin/reviews/${id}/restore`, { reason });

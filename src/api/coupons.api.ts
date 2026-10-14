import { get, post } from './client';
import type { Coupon, CouponCreate, CouponListQuery, Page } from './types';

export const listCoupons = (query: CouponListQuery) => get<Page<Coupon>>('/admin/coupons', { ...query });
export const createCoupon = (body: CouponCreate) => post<Coupon>('/admin/coupons', body);
export const activateCoupon = (id: string) => post<Coupon & { changed: boolean }>(`/admin/coupons/${id}/activate`);
export const deactivateCoupon = (id: string) => post<Coupon & { changed: boolean }>(`/admin/coupons/${id}/deactivate`);

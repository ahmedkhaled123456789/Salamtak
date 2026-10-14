import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as bookingsApi from '../api/bookings.api';
import * as couponsApi from '../api/coupons.api';
import * as emergencyApi from '../api/emergency.api';
import { ApiError } from '../api/errors';
import * as financeApi from '../api/finance.api';
import * as inboxApi from '../api/inbox.api';
import * as mediaApi from '../api/media.api';
import * as nursesApi from '../api/nurses.api';
import * as opsApi from '../api/ops.api';
import * as reviewsApi from '../api/reviews.api';
import type { AdjustmentRequest, CouponCreate } from '../api/types';
import * as usersApi from '../api/users.api';
import * as verificationApi from '../api/verification.api';

type KeyPrefix = readonly unknown[];

/**
 * Every write goes through here:
 *  - a synchronous in-flight lock, so a double-click can never send the same sensitive action twice
 *    (React state alone updates too late to stop the second click);
 *  - no optimistic updates and no automatic retries: the UI changes only after the backend confirms,
 *    by invalidating (re-fetching) the affected queries.
 */
function useApiMutation<V, R>(run: (vars: V) => Promise<R>, invalidate: readonly KeyPrefix[]) {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  return useMutation<R, ApiError, V>({
    mutationFn: async (vars) => {
      if (inFlight.current) throw new ApiError(409, 'IN_FLIGHT', 'The previous request is still being processed.');
      inFlight.current = true;
      try {
        return await run(vars);
      } finally {
        inFlight.current = false;
      }
    },
    onSuccess: async () => {
      await Promise.all([...invalidate, ['nav-badges'], ['dashboard']].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
}

/* -------------------------------- bookings -------------------------------- */
export const useCancelBooking = () =>
  useApiMutation((v: { id: string; reason: string; refundPercent?: number }) => bookingsApi.cancelBooking(v.id, { reason: v.reason, refundPercent: v.refundPercent }), [
    ['bookings'],
    ['refunds'],
    ['payments'],
  ]);

export const useResolveBooking = () =>
  useApiMutation(
    (v: { id: string; resolution: 'REFUND' | 'COMPLETE'; reason: string; refundPercent?: number }) =>
      bookingsApi.resolveBooking(v.id, { resolution: v.resolution, reason: v.reason, refundPercent: v.refundPercent }),
    [['bookings'], ['refunds'], ['payments']],
  );

/* --------------------------------- people --------------------------------- */
export const useSetUserBlocked = () =>
  useApiMutation((v: { id: string; blocked: boolean; reason?: string }) => usersApi.setUserBlocked(v.id, v.blocked, v.reason), [['users']]);

export const useSuspendNurse = () => useApiMutation((v: { id: string; reason: string }) => nursesApi.suspendNurse(v.id, v.reason), [['nurses'], ['verification']]);
export const useReactivateNurse = () => useApiMutation((v: { id: string }) => nursesApi.reactivateNurse(v.id), [['nurses'], ['verification']]);

/* ------------------------------- verification ------------------------------ */
const VERIFICATION: readonly KeyPrefix[] = [['verification'], ['documents'], ['nurses']];
export const useApproveDocument = () => useApiMutation((v: { id: string }) => verificationApi.approveDocument(v.id), VERIFICATION);
export const useRejectDocument = () => useApiMutation((v: { id: string; reason: string }) => verificationApi.rejectDocument(v.id, v.reason), VERIFICATION);
export const useApproveNurse = () => useApiMutation((v: { id: string }) => verificationApi.approveNurse(v.id), VERIFICATION);
export const useRejectNurse = () => useApiMutation((v: { id: string; reason: string }) => verificationApi.rejectNurse(v.id, v.reason), VERIFICATION);

/* ---------------------------------- finance -------------------------------- */
export const useRetryRefund = () => useApiMutation((v: { id: string }) => financeApi.retryRefund(v.id), [['refunds']]);
export const useCancelPayout = () => useApiMutation((v: { id: string }) => financeApi.cancelPayout(v.id), [['payouts'], ['wallet']]);

export const useRequestAdjustment = () =>
  useApiMutation((v: { nurseId: string; body: AdjustmentRequest; idempotencyKey: string }) => financeApi.requestAdjustment(v.nurseId, v.body, v.idempotencyKey), [
    ['adjustments'],
    ['wallet'],
  ]);
export const useApproveAdjustment = () =>
  useApiMutation((v: { id: string; note?: string }) => financeApi.approveAdjustment(v.id, v.note), [['adjustments'], ['wallet']]);
export const useRejectAdjustment = () => useApiMutation((v: { id: string; note: string }) => financeApi.rejectAdjustment(v.id, v.note), [['adjustments']]);
export const useResolveAlert = () => useApiMutation((v: { id: string }) => financeApi.resolveAlert(v.id), [['alerts']]);

/* -------------------------------- engagement ------------------------------- */
export type ModerationAction = 'hide' | 'flag' | 'restore';
export const useModerateReview = () =>
  useApiMutation(
    (v: { id: string; action: ModerationAction; reason: string }) => {
      if (v.action === 'hide') return reviewsApi.hideReview(v.id, v.reason);
      if (v.action === 'flag') return reviewsApi.flagReview(v.id, v.reason);
      return reviewsApi.restoreReview(v.id, v.reason || undefined);
    },
    [['reviews']],
  );

export const useCreateCoupon = () => useApiMutation((v: CouponCreate) => couponsApi.createCoupon(v), [['coupons']]);
export const useSetCouponActive = () =>
  useApiMutation((v: { id: string; active: boolean }) => (v.active ? couponsApi.activateCoupon(v.id) : couponsApi.deactivateCoupon(v.id)), [['coupons']]);

/* --------------------------------- emergency ------------------------------- */
export const useCancelEmergency = () => useApiMutation((v: { id: string; reason: string }) => emergencyApi.cancelEmergencyRequest(v.id, v.reason), [['emergency']]);
export const useReopenEmergency = () => useApiMutation((v: { id: string }) => emergencyApi.reopenEmergencyRequest(v.id), [['emergency']]);

/* ------------------------------- notifications ------------------------------ */
export const useMarkAllNotificationsRead = () => useApiMutation<void, unknown>(() => opsApi.markAllNotificationsRead(), [['notifications']]);

/* ------------------------------------ inbox / media ------------------------------------ */
export const useHandleContactMessage = () =>
  useApiMutation((v: { id: string; note?: string }) => inboxApi.handleContactMessage(v.id, v.note), [['inbox']]);
export const useUploadServiceImage = () =>
  useApiMutation((v: { serviceId: string; file: File }) => mediaApi.uploadServiceImage(v.serviceId, v.file), [['services']]);
export const useUploadUserAvatar = () =>
  useApiMutation((v: { userId: string; file: File }) => mediaApi.uploadUserAvatar(v.userId, v.file), [['nurses'], ['users']]);

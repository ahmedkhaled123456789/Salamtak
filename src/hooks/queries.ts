import { keepPreviousData, useQuery } from '@tanstack/react-query';
import * as bookingsApi from '../api/bookings.api';
import * as couponsApi from '../api/coupons.api';
import * as dashboardApi from '../api/dashboard.api';
import * as emergencyApi from '../api/emergency.api';
import * as financeApi from '../api/finance.api';
import * as inboxApi from '../api/inbox.api';
import * as nursesApi from '../api/nurses.api';
import * as opsApi from '../api/ops.api';
import * as reviewsApi from '../api/reviews.api';
import * as usersApi from '../api/users.api';
import * as verificationApi from '../api/verification.api';
import type {
  AuditListQuery,
  BookingListQuery,
  BookingStatus,
  CouponListQuery,
  DateRangeQuery,
  DocumentListQuery,
  EmergencyListQuery,
  NotificationListQuery,
  NurseListQuery,
  PageQuery,
  PaymentListQuery,
  PayoutListQuery,
  RefundListQuery,
  ReviewListQuery,
  ServiceListQuery,
  UserListQuery,
  AdjustmentStatus,
} from '../api/types';

/** One key per resource; mutations invalidate by these prefixes. */
export const keys = {
  stats: (range?: DateRangeQuery) => ['dashboard', 'stats', range ?? {}] as const,
  marketplaceReport: (range?: DateRangeQuery) => ['dashboard', 'marketplace-report', range ?? {}] as const,
  bookingCount: (status: BookingStatus) => ['dashboard', 'booking-count', status] as const,
  bookings: (q: BookingListQuery) => ['bookings', 'list', q] as const,
  booking: (id: string) => ['bookings', 'detail', id] as const,
  bookingHistory: (id: string) => ['bookings', 'history', id] as const,
  users: (q: UserListQuery) => ['users', q] as const,
  nurses: (q: NurseListQuery) => ['nurses', q] as const,
  documents: (q: DocumentListQuery) => ['documents', q] as const,
  verification: (nurseId: string) => ['verification', nurseId] as const,
  payments: (q: PaymentListQuery) => ['payments', q] as const,
  refunds: (q: RefundListQuery) => ['refunds', q] as const,
  payouts: (q: PayoutListQuery) => ['payouts', q] as const,
  wallet: (nurseId: string) => ['wallet', nurseId] as const,
  adjustments: (q: PageQuery & { status?: AdjustmentStatus }) => ['adjustments', q] as const,
  alerts: (q: PageQuery & { status?: 'OPEN' | 'RESOLVED' }) => ['alerts', q] as const,
  reconciliation: () => ['reconciliation'] as const,
  reviews: (q: ReviewListQuery) => ['reviews', q] as const,
  coupons: (q: CouponListQuery) => ['coupons', q] as const,
  emergency: (q: EmergencyListQuery) => ['emergency', 'list', q] as const,
  emergencyDetail: (id: string) => ['emergency', 'detail', id] as const,
  queues: () => ['queues'] as const,
  audit: (q: AuditListQuery) => ['audit', q] as const,
  settings: () => ['settings'] as const,
  services: (q: ServiceListQuery) => ['services', q] as const,
  conversations: (q: PageQuery) => ['conversations', q] as const,
  notifications: (q: NotificationListQuery) => ['notifications', q] as const,
  unread: () => ['notifications', 'unread'] as const,
};

const paged = { placeholderData: keepPreviousData } as const;

/* ------------------------------- dashboard ------------------------------- */
export const useDashboardStats = (range?: DateRangeQuery) => useQuery({ queryKey: keys.stats(range), queryFn: () => dashboardApi.getStats(range) });
export const useMarketplaceReport = (range?: DateRangeQuery) =>
  useQuery({ queryKey: keys.marketplaceReport(range), queryFn: () => dashboardApi.getMarketplaceReport(range) });
export const useBookingCount = (status: BookingStatus) => useQuery({ queryKey: keys.bookingCount(status), queryFn: () => dashboardApi.countBookings(status) });

/* ------------------------------- marketplace ------------------------------ */
export const useBookings = (q: BookingListQuery, enabled = true) =>
  useQuery({ queryKey: keys.bookings(q), queryFn: () => bookingsApi.listBookings(q), enabled, ...paged });
export const useBooking = (id: string | null) => useQuery({ queryKey: keys.booking(id ?? ''), queryFn: () => bookingsApi.getBooking(id as string), enabled: Boolean(id) });
export const useBookingHistory = (id: string | null) =>
  useQuery({ queryKey: keys.bookingHistory(id ?? ''), queryFn: () => bookingsApi.getBookingHistory(id as string), enabled: Boolean(id) });
export const useUsers = (q: UserListQuery) => useQuery({ queryKey: keys.users(q), queryFn: () => usersApi.listUsers(q), ...paged });
export const useNurses = (q: NurseListQuery) => useQuery({ queryKey: keys.nurses(q), queryFn: () => nursesApi.listNurses(q), ...paged });
export const useEmergencyRequests = (q: EmergencyListQuery, refetchMs?: number) =>
  useQuery({ queryKey: keys.emergency(q), queryFn: () => emergencyApi.listEmergencyRequests(q), refetchInterval: refetchMs, ...paged });
export const useEmergencyDetail = (id: string | null) =>
  useQuery({ queryKey: keys.emergencyDetail(id ?? ''), queryFn: () => emergencyApi.getEmergencyRequest(id as string), enabled: Boolean(id) });

/* ------------------------------- verification ------------------------------ */
export const useDocuments = (q: DocumentListQuery) => useQuery({ queryKey: keys.documents(q), queryFn: () => verificationApi.listDocuments(q), ...paged });
export const useVerificationDetail = (nurseId: string | null) =>
  useQuery({ queryKey: keys.verification(nurseId ?? ''), queryFn: () => verificationApi.getVerificationDetail(nurseId as string), enabled: Boolean(nurseId) });

/* --------------------------------- finance -------------------------------- */
export const usePayments = (q: PaymentListQuery) => useQuery({ queryKey: keys.payments(q), queryFn: () => financeApi.listPayments(q), ...paged });
export const useRefunds = (q: RefundListQuery) => useQuery({ queryKey: keys.refunds(q), queryFn: () => financeApi.listRefunds(q), ...paged });
export const usePayouts = (q: PayoutListQuery) => useQuery({ queryKey: keys.payouts(q), queryFn: () => financeApi.listPayouts(q), ...paged });
export const useWallet = (nurseId: string | null) =>
  useQuery({ queryKey: keys.wallet(nurseId ?? ''), queryFn: () => financeApi.getWallet(nurseId as string), enabled: Boolean(nurseId) });
export const useAdjustments = (q: PageQuery & { status?: AdjustmentStatus }) =>
  useQuery({ queryKey: keys.adjustments(q), queryFn: () => financeApi.listAdjustments(q), ...paged });
export const useAlerts = (q: PageQuery & { status?: 'OPEN' | 'RESOLVED' }) => useQuery({ queryKey: keys.alerts(q), queryFn: () => financeApi.listAlerts(q), ...paged });
export const useReconciliation = () => useQuery({ queryKey: keys.reconciliation(), queryFn: financeApi.getReconciliation });

/* -------------------------------- engagement ------------------------------- */
export const useReviews = (q: ReviewListQuery) => useQuery({ queryKey: keys.reviews(q), queryFn: () => reviewsApi.listReviews(q), ...paged });
export const useCoupons = (q: CouponListQuery) => useQuery({ queryKey: keys.coupons(q), queryFn: () => couponsApi.listCoupons(q), ...paged });

/* -------------------------------- operations ------------------------------- */
export const useQueueHealth = (refetchMs?: number) => useQuery({ queryKey: keys.queues(), queryFn: opsApi.getQueueHealth, refetchInterval: refetchMs });
export const useAuditLogs = (q: AuditListQuery) => useQuery({ queryKey: keys.audit(q), queryFn: () => opsApi.listAuditLogs(q), ...paged });
export const useSettings = () => useQuery({ queryKey: keys.settings(), queryFn: opsApi.getSettings });
export const useServices = (q: ServiceListQuery) => useQuery({ queryKey: keys.services(q), queryFn: () => opsApi.listServices(q), ...paged });
export const useConversations = (q: PageQuery) => useQuery({ queryKey: keys.conversations(q), queryFn: () => opsApi.listConversations(q), ...paged });
export const useNotifications = (q: NotificationListQuery) => useQuery({ queryKey: keys.notifications(q), queryFn: () => opsApi.listNotifications(q), ...paged });
export const useUnreadCount = () => useQuery({ queryKey: keys.unread(), queryFn: opsApi.getUnreadNotificationCount, refetchInterval: 60_000 });

/* ------------------------------------ inbox ------------------------------------ */
type InboxStatusQuery<S> = { page?: number; limit?: number; status?: S };
export const useContactMessages = (q: InboxStatusQuery<'NEW' | 'HANDLED'>) =>
  useQuery({ queryKey: ['inbox', 'messages', q], queryFn: () => inboxApi.listContactMessages(q), ...paged });
export const useSubscribers = (q: InboxStatusQuery<'PENDING' | 'SUBSCRIBED' | 'UNSUBSCRIBED'>) =>
  useQuery({ queryKey: ['inbox', 'subscribers', q], queryFn: () => inboxApi.listSubscribers(q), ...paged });
export const useInboxCounts = (enabled = true) =>
  useQuery({ queryKey: ['inbox', 'counts'], queryFn: inboxApi.getInboxCounts, enabled });

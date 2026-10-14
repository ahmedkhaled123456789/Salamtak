/**
 * Wire types for the care-backend REST API (/api/v1). Derived from docs/openapi.json and the route code.
 * Money is ALWAYS an integer in fils ("minor" units, 1 AED = 100 fils); fields are named `*Minor`.
 * Dates arrive as ISO strings.
 */

export interface Envelope<T> {
  success: true;
  data: T;
  message: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface Page<T> {
  items: T[];
  meta: PageMeta;
}
export interface PageQuery {
  page?: number;
  limit?: number;
}
export interface DateRangeQuery {
  from?: string;
  to?: string;
}

/* ---------------------------------- auth ---------------------------------- */
export type Role = 'PATIENT' | 'NURSE' | 'ADMIN' | 'FINANCE_APPROVER';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface AccountUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface LoginResult {
  user: AccountUser;
  tokens: Tokens;
}

/* -------------------------------- dashboard -------------------------------- */
export interface DashboardStats {
  totalUsers: number;
  totalPatients: number;
  totalNurses: number;
  verifiedNurses: number;
  pendingNurses: number;
  suspendedNurses: number;
}

export type CountMap = Record<string, number>;

export interface MarketplaceReport {
  nursesByVerification: CountMap;
  nursesByStatus: CountMap;
  documentsByStatus: CountMap;
  documentsPendingReview: number;
  reviewsByStatus: CountMap;
  averageRatingActive: number | null;
  coupons: {
    total: number;
    active: number;
    redemptionsApplied: number;
    redemptionsReleased: number;
    discountGrantedMinor: number;
  };
  emergencyByStatus: CountMap;
  conversations: { booking: number; support: number };
  activeDevices: number;
}

/* ---------------------------------- bookings ---------------------------------- */
export const BOOKING_STATUSES = [
  'PENDING',
  'PAYMENT_PENDING',
  'PAID',
  'NURSE_PENDING',
  'NURSE_ACCEPTED',
  'NURSE_REJECTED',
  'CONFIRMED',
  'CARE_STARTED',
  'CARE_IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
  'REFUND_PENDING',
  'REFUNDED',
  'DISPUTED',
  'FAILED',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface PricingLine {
  code: 'BASE' | 'WEEKEND_SURCHARGE' | 'HOLIDAY_SURCHARGE' | 'FEE' | 'DISCOUNT';
  label: string;
  quantity: number;
  unitAmountMinor: number;
  amountMinor: number;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  statusUpdatedAt: string;
  statusReason: string | null;
  service: { id: string; name: string; slug: string; billingUnit: string };
  nurse?: { id: string; displayName: string };
  patient?: { displayName: string };
  startDateTime: string;
  endDateTime: string;
  durationMinutes: number;
  /** Only city/country are kept; the street address and GPS position are dropped at the API boundary. */
  location: { city: string | null; country: string | null };
  refund?: {
    status: 'NONE' | 'PENDING' | 'COMPLETED' | 'FAILED';
    reason: string;
    percent: number;
    amountMinor: number;
    requestedAt: string;
    completedAt: string | null;
  };
  cancellationOutcome?: { cancelledBy: 'PATIENT' | 'ADMIN'; hoursBeforeStart: number; refundPercent: number; refundMinor: number };
  cancellation?: { nurseCompensationMinor: number };
  pricing?: {
    currency: 'AED';
    lines: PricingLine[];
    baseMinor: number;
    surchargeMinor: number;
    feesMinor: number;
    grossMinor: number;
    discountMinor: number;
    patientPayableMinor: number;
    pricingVersion: string;
    couponCode?: string | null;
  };
  earnings?: { currency: 'AED'; nurseEarningMinor: number };
  createdAt: string;
  updatedAt: string;
}

export interface BookingHistoryEntry {
  previousState: BookingStatus | null;
  newState: BookingStatus;
  actorRole: 'PATIENT' | 'NURSE' | 'ADMIN' | 'SYSTEM';
  reason?: string | null;
  createdAt: string;
}

export interface BookingListQuery extends PageQuery, DateRangeQuery {
  status?: BookingStatus;
  patientId?: string;
  nurseId?: string;
}

/* ----------------------------------- people ----------------------------------- */
export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
}
export interface UserListQuery extends PageQuery, DateRangeQuery {
  role?: Role;
  isActive?: boolean;
  search?: string;
}

export type NurseStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
export type VerificationStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export interface NurseProfile {
  id: string;
  userId: string;
  /** Present on the admin list (populated server-side). */
  user?: { id: string; firstName: string; lastName: string; email?: string; phone?: string; isActive?: boolean; photoUrl?: string };
  bio: string | null;
  yearsOfExperience: number;
  specializations: string[];
  languages: string[];
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  dailyRateMinor: number | null;
  hourlyRateMinor: number | null;
  currency: 'AED';
  serviceRadiusKm: number;
  address: string | null;
  city: string | null;
  country: string | null;
  status: NurseStatus;
  verificationStatus: VerificationStatus;
  statusReason: string | null;
  averageRating: number;
  totalReviews: number;
  totalCompletedBookings: number;
  isBookable: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface NurseListQuery extends PageQuery {
  status?: NurseStatus;
  verificationStatus?: VerificationStatus;
  isBookable?: boolean;
}

/* ------------------------------ nurse verification ------------------------------ */
export type DocumentType = 'NURSING_LICENSE' | 'IDENTITY_DOCUMENT' | 'CERTIFICATE' | 'QUALIFICATION' | 'INSURANCE' | 'OTHER';

export interface NurseDocument {
  id: string;
  nurseId: string;
  type: DocumentType;
  fileId: string;
  documentNumber: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: VerificationStatus;
  rejectionReason: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface NurseVerificationDetail {
  nurse: NurseProfile;
  documents: NurseDocument[];
}
export interface DocumentListQuery extends PageQuery {
  status?: VerificationStatus;
  type?: DocumentType;
  nurseId?: string;
}
export interface FileAccessUrl {
  url: string;
  expiresAt: string;
}

/* ----------------------------------- finance ----------------------------------- */
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export interface Payment {
  id: string;
  bookingId: string;
  provider: string;
  reference: string;
  amountMinor: number;
  currency: 'AED';
  status: PaymentStatus;
  refundedMinor: number;
  settlement: 'APPLIED' | 'LATE_REFUND' | 'DUPLICATE_REFUND' | null;
  paidAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PaymentListQuery extends PageQuery {
  status?: PaymentStatus;
  bookingId?: string;
}

export type RefundStatus = 'PENDING' | 'PROCESSING' | 'PROVIDER_SUCCEEDED' | 'SUCCEEDED' | 'FAILED';
export type RefundReason =
  | 'PATIENT_CANCELLATION'
  | 'NURSE_REJECTED'
  | 'NURSE_TIMEOUT'
  | 'ADMIN_CANCELLATION'
  | 'ADMIN_RESOLUTION'
  | 'BOOKING_EXPIRED_BEFORE_PAYMENT_CONFIRMATION'
  | 'DUPLICATE_PAYMENT';
export interface Refund {
  id: string;
  bookingId: string | null;
  paymentId: string;
  provider: string;
  amountMinor: number;
  currency: 'AED';
  percent: number;
  type: 'FULL' | 'PARTIAL';
  reason: RefundReason;
  status: RefundStatus;
  providerRefundId: string | null;
  attempts: number;
  failureCount: number;
  lastError: string | null;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface RefundListQuery extends PageQuery {
  status?: RefundStatus;
  bookingId?: string;
  reason?: RefundReason;
}

export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'PROVIDER_PAID' | 'PAID' | 'FAILED' | 'CANCELLED';
export interface Payout {
  id: string;
  nurseId: string;
  amountMinor: number;
  status: PayoutStatus;
  provider: string;
  providerPayoutId: string | null;
  attempts: number;
  lastError: string | null;
  nextRetryAt: string | null;
  paidAt: string | null;
  createdAt: string;
}
export interface PayoutListQuery extends PageQuery {
  status?: PayoutStatus;
  nurseId?: string;
}

export interface Wallet {
  nurseId: string;
  availableBalanceMinor: number;
  pendingBalanceMinor: number;
  totalEarnedMinor: number;
  totalWithdrawnMinor: number;
  currency: 'AED';
}

export type AdjustmentStatus = 'PENDING' | 'APPLIED' | 'REJECTED';
export interface WalletAdjustment {
  id: string;
  nurseId: string;
  bucket: 'PENDING' | 'AVAILABLE';
  amountMinor: number;
  reason: string;
  status: AdjustmentStatus;
  requestedBy: string;
  decidedBy: string | null;
  approvalReason: string | null;
  ledgerId: string | null;
  createdAt: string;
}
export interface AdjustmentRequest {
  bucket: 'PENDING' | 'AVAILABLE';
  /** Signed integer fils: positive credits the wallet, negative debits it. */
  amountMinor: number;
  reason: string;
}
export interface AdjustmentResult {
  adjustmentId: string;
  status: AdjustmentStatus;
  ledgerId: string | null;
  applied: boolean;
}

export interface Alert {
  id: string;
  key: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  entity: string;
  entityId: string | null;
  message: string;
  status: 'OPEN' | 'RESOLVED';
  count: number;
  lastSeenAt: string;
  createdAt: string;
}

export interface ReconciliationReport {
  ok: boolean;
  generatedAt: string;
  /** All-time, ledger-derived totals computed by the server over every paid booking (fils). Not a time series. */
  totals: {
    bookingsPaid: number;
    grossMinor: number;
    patientPaidMinor: number;
    commissionMinor: number;
    nurseEarningMinor: number;
    refundedMinor: number;
    paidOutMinor: number;
  };
  checks: { name: string; ok: boolean; checked: number; problems: string[] }[];
}

/* -------------------------------- engagement -------------------------------- */
export type ReviewStatus = 'ACTIVE' | 'HIDDEN' | 'FLAGGED';
export interface Review {
  id: string;
  bookingId: string;
  nurseId: string;
  patientId: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  moderationReason: string | null;
  moderatedBy: string | null;
  moderatedAt: string | null;
}
export interface ReviewListQuery extends PageQuery {
  status?: ReviewStatus;
  nurseId?: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: 'FIXED' | 'PERCENTAGE';
  valueMinor: number | null;
  valueBps: number | null;
  maxDiscountMinor: number | null;
  minBookingAmountMinor: number;
  usageLimit: number | null;
  perUserLimit: number | null;
  startAt: string;
  endAt: string;
  active: boolean;
  applicableServiceIds: string[];
  applicableNurseIds: string[];
  usedCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export interface CouponCreate {
  code: string;
  description?: string;
  type: 'FIXED' | 'PERCENTAGE';
  valueMinor?: number;
  valueBps?: number;
  maxDiscountMinor?: number;
  minBookingAmountMinor?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startAt: string | null;
  endAt: string | null;
}
export interface CouponListQuery extends PageQuery {
  active?: boolean;
}

/* ---------------------------------- emergency ---------------------------------- */
export type EmergencyStatus = 'PENDING' | 'MATCHING' | 'NURSE_OFFERED' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED' | 'FAILED';
export interface EmergencyRequest {
  id: string;
  status: EmergencyStatus;
  statusReason: string | null;
  serviceId: string;
  patientId: string;
  acceptedNurseId: string | null;
  requestedStart: string;
  durationMinutes: number;
  genderPreference: 'MALE' | 'FEMALE' | 'OTHER' | null;
  expiresAt: string;
  offersMade: number;
  bookingId: string | null;
  createdAt: string;
  /** The backend also returns an exact address, coordinates and free-text notes. The dashboard only keeps the city. */
  location: { city: string | null };
}
export interface EmergencyOffer {
  id: string;
  nurseId: string;
  status: string;
  round: number;
  score: number | null;
  expiresAt: string;
  respondedAt: string | null;
}
export interface EmergencyDetail {
  request: EmergencyRequest;
  patientName: string | null;
  offers: EmergencyOffer[];
}
export interface EmergencyListQuery extends PageQuery {
  status?: EmergencyStatus;
  patientId?: string;
}

/* ---------------------------------- operations ---------------------------------- */
export interface QueueHealth {
  available: boolean;
  backend: string;
  error: string | null;
  queues: {
    queue: string;
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
    paused: number;
    oldestWaitingSeconds: number;
  }[];
  schedulers: { queue: string; job: string; everySeconds: number | null }[];
  workers: { id: string; startedAt: string; lastSeenAt: string; queues: string[]; alive: boolean }[];
}

export interface AuditEntry {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  at: string;
  requestId: string | null;
}
export interface AuditListQuery extends PageQuery {
  entity?: string;
  entityId?: string;
  action?: string;
}

export type PlatformSettings = Record<string, unknown>;

export interface ServiceItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  isActive: boolean;
  billingUnit: 'HOURLY' | 'DAILY';
  minDurationMinutes: number;
  maxDurationMinutes: number;
  /** Public picture (`imageId` on the raw document; URL built like the backend's `mediaUrl`). */
  imageId?: string | null;
  imageUrl?: string | null;
  createdAt: string;
}
export interface ServiceListQuery extends PageQuery {
  isActive?: boolean;
  category?: string;
}

export interface Conversation {
  id: string;
  type: 'BOOKING' | 'SUPPORT';
  bookingId: string | null;
  bookingNumber: string | null;
  counterpart: string;
  unread: number;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}
export interface NotificationListQuery extends PageQuery {
  unread?: boolean;
}

/* ------------------------------------ inbox ------------------------------------ */
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  topic: 'CARE' | 'BOOKING' | 'PARTNER' | 'OTHER';
  message: string;
  locale: 'en' | 'ar';
  status: 'NEW' | 'HANDLED';
  note: string | null;
  handledAt: string | null;
  createdAt: string;
}
export interface NewsletterSubscriber {
  id: string;
  email: string;
  locale: 'en' | 'ar';
  status: 'PENDING' | 'SUBSCRIBED' | 'UNSUBSCRIBED';
  consentAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
}
export interface InboxCounts {
  newContactMessages: number;
  subscribers: number;
}

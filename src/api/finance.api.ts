import { get, patch, post } from './client';
import type {
  AdjustmentRequest,
  AdjustmentResult,
  AdjustmentStatus,
  Alert,
  Page,
  PageQuery,
  Payment,
  PaymentListQuery,
  Payout,
  PayoutListQuery,
  ReconciliationReport,
  Refund,
  RefundListQuery,
  Wallet,
  WalletAdjustment,
} from './types';

export const listPayments = (query: PaymentListQuery) => get<Page<Payment>>('/admin/payments', { ...query });

export const listRefunds = (query: RefundListQuery) => get<Page<Refund>>('/admin/refunds', { ...query });
/** ADMIN only (admin:finance:manage). Re-opens a FAILED refund; the backend queues the provider call. */
export const retryRefund = (id: string) => post<Refund>(`/admin/refunds/${id}/retry`);

export const listPayouts = (query: PayoutListQuery) => get<Page<Payout>>('/admin/payouts', { ...query });
/** ADMIN only. Only unprocessed payouts can be cancelled; the backend enforces the state machine. */
export const cancelPayout = (id: string) => post<Payout>(`/admin/payouts/${id}/cancel`);

/** Read-only balance snapshot (id = nurse profile id). */
export const getWallet = (nurseId: string) => get<Wallet>(`/admin/wallets/${nurseId}`);

/** Maker side. `idempotencyKey` must stay the same across retries of the same attempt. */
export const requestAdjustment = (nurseId: string, body: AdjustmentRequest, idempotencyKey: string) =>
  post<AdjustmentResult>(`/admin/wallets/${nurseId}/adjustments`, body, { idempotencyKey });

export const listAdjustments = (query: PageQuery & { status?: AdjustmentStatus }) => get<Page<WalletAdjustment>>('/admin/wallet-adjustments', { ...query });
/** Checker side (FINANCE_APPROVER only). The backend rejects approval of your own request. */
export const approveAdjustment = (id: string, note?: string) => post<WalletAdjustment>(`/admin/wallet-adjustments/${id}/approve`, { note });
export const rejectAdjustment = (id: string, note: string) => post<WalletAdjustment>(`/admin/wallet-adjustments/${id}/reject`, { note });

export const listAlerts = (query: PageQuery & { status?: 'OPEN' | 'RESOLVED' }) => get<Page<Alert>>('/admin/alerts', { ...query });
export const resolveAlert = (id: string) => patch<{ resolved: boolean }>(`/admin/alerts/${id}/resolve`);

export const getReconciliation = () => get<ReconciliationReport>('/admin/reconciliation');

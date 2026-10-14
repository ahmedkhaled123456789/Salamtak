import { useQueries, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { countBookings, getMarketplaceReport } from '../api/dashboard.api';
import { listAdjustments, listAlerts, listPayouts, listRefunds } from '../api/finance.api';
import { useSession } from '../contexts/SessionContext';

export interface AttentionItem {
  id: string;
  count: number;
  label: string;
  action: string;
  to: string;
  severity: 'critical' | 'warning' | 'info';
}

interface Source {
  id: string;
  /** Permission needed both to read the count and to open the screen the item links to. */
  permissions: string[];
  load: (qc: QueryClient) => Promise<number>;
  label: (n: number) => string;
  action: string;
  to: string;
  severity: AttentionItem['severity'];
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const OPEN_EMERGENCY = ['PENDING', 'MATCHING', 'NURSE_OFFERED'];

/** One shared, cached fetch of the marketplace report (same key as useMarketplaceReport) for every source that needs it. */
const report = (qc: QueryClient) => qc.fetchQuery({ queryKey: ['dashboard', 'marketplace-report', {}], queryFn: () => getMarketplaceReport(), staleTime: 30_000 });

const sources: Source[] = [
{
  id: 'verification',
  permissions: ['admin:reports:read', 'admin:nurse-documents:review'],
  load: async (qc) => (await report(qc)).nursesByVerification.UNDER_REVIEW ?? 0,
  label: (n) => `${plural(n, 'nurse is', 'nurses are')} waiting for verification`,
  action: 'Review',
  to: '/operations/verification',
  severity: 'warning'
},
{
  id: 'emergency',
  permissions: ['admin:reports:read', 'admin:emergency:manage'],
  load: async (qc) => {
    const r = await report(qc);
    return OPEN_EMERGENCY.reduce((n, s) => n + (r.emergencyByStatus[s] ?? 0), 0);
  },
  label: (n) => `emergency ${plural(n, 'request is', 'requests are')} still open`,
  action: 'Open console',
  to: '/emergency',
  severity: 'critical'
},
{
  id: 'flagged-reviews',
  permissions: ['admin:reports:read', 'admin:reviews:moderate'],
  load: async (qc) => (await report(qc)).reviewsByStatus.FLAGGED ?? 0,
  label: (n) => `${plural(n, 'review is', 'reviews are')} flagged for moderation`,
  action: 'Moderate',
  to: '/reviews',
  severity: 'warning'
},
{
  id: 'disputed',
  permissions: ['admin:bookings:read'],
  load: () => countBookings('DISPUTED'),
  label: (n) => `${plural(n, 'booking is', 'bookings are')} disputed`,
  action: 'Resolve',
  to: '/bookings?status=DISPUTED',
  severity: 'critical'
},
{
  id: 'approvals',
  permissions: ['admin:finance:read'],
  load: async () => (await listAdjustments({ status: 'PENDING', limit: 1 })).meta.total,
  label: (n) => `wallet ${plural(n, 'adjustment is', 'adjustments are')} awaiting approval`,
  action: 'View',
  to: '/finance/approvals',
  severity: 'info'
},
{
  id: 'failed-refunds',
  permissions: ['admin:finance:read'],
  load: async () => (await listRefunds({ status: 'FAILED', limit: 1 })).meta.total,
  label: (n) => `${plural(n, 'refund has', 'refunds have')} failed`,
  action: 'Review',
  to: '/finance/refunds',
  severity: 'critical'
},
{
  id: 'failed-payouts',
  permissions: ['admin:finance:read'],
  load: async () => (await listPayouts({ status: 'FAILED', limit: 1 })).meta.total,
  label: (n) => `${plural(n, 'payout has', 'payouts have')} failed`,
  action: 'Review',
  to: '/finance/payouts',
  severity: 'critical'
},
{
  id: 'alerts',
  permissions: ['admin:finance:read'],
  load: async () => (await listAlerts({ status: 'OPEN', limit: 1 })).meta.total,
  label: (n) => `operational ${plural(n, 'alert is', 'alerts are')} open`,
  action: 'Inspect',
  to: '/finance/reconciliation',
  severity: 'warning'
}];


const rank = { critical: 0, warning: 1, info: 2 } as const;

/** Open work items, each from a backend total. Items the role can't open are never requested. */
export function useAttention() {
  const { can } = useSession();
  const qc = useQueryClient();
  const active = sources.filter((s) => s.permissions.every(can));
  const results = useQueries({
    queries: active.map((s) => ({
      queryKey: ['dashboard', 'attention', s.id],
      queryFn: () => s.load(qc),
      staleTime: 30_000
    }))
  });

  const items: AttentionItem[] = [];
  results.forEach((r, i) => {
    const s = active[i];
    if (r.data && r.data > 0) items.push({ id: s.id, count: r.data, label: s.label(r.data), action: s.action, to: s.to, severity: s.severity });
  });
  items.sort((a, b) => rank[a.severity] - rank[b.severity]);

  const failed = results.filter((r) => r.isError).length;
  return {
    items,
    isLoading: results.some((r) => r.isLoading),
    /** Some sources failed — the list may be incomplete, which the UI says rather than showing "all clear". */
    partialFailure: failed > 0 && failed < results.length,
    isError: results.length > 0 && failed === results.length,
    refetch: () => results.forEach((r) => void r.refetch())
  };
}

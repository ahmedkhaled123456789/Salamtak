import { useQuery } from '@tanstack/react-query';
import { listAdjustments } from '../api/finance.api';
import { getInboxCounts } from '../api/inbox.api';
import { listNurses } from '../api/nurses.api';
import { getMarketplaceReport } from '../api/dashboard.api';
import { useSession } from '../contexts/SessionContext';

const OPEN_EMERGENCY = ['PENDING', 'MATCHING', 'NURSE_OFFERED'];

/**
 * Live counts for the sidebar, read from the backend's own totals (pagination `meta.total` and the
 * marketplace report). Each badge is fetched only if the role may open that screen. Missing = no badge;
 * nothing is ever estimated.
 */
export function useNavBadges(): Record<string, number> {
  const { can } = useSession();

  const verification = useQuery({
    queryKey: ['nav-badges', 'verification'],
    queryFn: async () => (await listNurses({ verificationStatus: 'UNDER_REVIEW', limit: 1 })).meta.total,
    enabled: can('admin:nurse-documents:review') && can('admin:nurses:read'),
    refetchInterval: 60_000,
  });
  const approvals = useQuery({
    queryKey: ['nav-badges', 'approvals'],
    queryFn: async () => (await listAdjustments({ status: 'PENDING', limit: 1 })).meta.total,
    enabled: can('admin:finance:read'),
    refetchInterval: 60_000,
  });
  const emergency = useQuery({
    queryKey: ['nav-badges', 'emergency'],
    queryFn: async () => {
      const report = await getMarketplaceReport();
      return OPEN_EMERGENCY.reduce((sum, status) => sum + (report.emergencyByStatus[status] ?? 0), 0);
    },
    enabled: can('admin:emergency:manage') && can('admin:reports:read'),
    refetchInterval: 60_000,
  });

  const inbox = useQuery({
    queryKey: ['nav-badges', 'inbox'],
    queryFn: async () => (await getInboxCounts()).newContactMessages,
    enabled: can('admin:inbox:manage'),
    refetchInterval: 60_000,
  });

  const badges: Record<string, number> = {};
  if (inbox.data) badges['/inbox'] = inbox.data;
  if (verification.data) badges['/operations/verification'] = verification.data;
  if (approvals.data) badges['/finance/approvals'] = approvals.data;
  if (emergency.data) badges['/emergency'] = emergency.data;
  return badges;
}

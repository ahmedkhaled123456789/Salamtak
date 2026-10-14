import { useMemo, useState } from 'react';
import { LockIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Drawer } from '../../components/ui/Drawer';
import { DetailList } from '../../components/ui/DetailList';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Pagination } from '../../components/ui/Pagination';
import { ApprovalsTable } from '../../components/finance/ApprovalsTable';
import { useAdjustments } from '../../hooks/queries';
import { useSession } from '../../contexts/SessionContext';
import { formatFils } from '../../utils/money';
import { formatDateTime } from '../../utils/date';
import { shortId, titleCase } from '../../utils/people';
import type { AdjustmentStatus, WalletAdjustment } from '../../api/types';

type Tab = AdjustmentStatus | 'all';
const TABS: { value: Tab; label: string }[] = [
{ value: 'PENDING', label: 'Awaiting' },
{ value: 'APPLIED', label: 'Applied' },
{ value: 'REJECTED', label: 'Rejected' },
{ value: 'all', label: 'All' }];


export function FinanceApprovals() {
  const { user, can } = useSession();
  const [tab, setTab] = useState<Tab>('PENDING');
  const [page, setPage] = useState(1);
  const [reviewing, setReviewing] = useState<WalletAdjustment | null>(null);

  const query = useMemo(() => ({ page, limit: 20, status: tab === 'all' ? undefined : tab }), [page, tab]);
  const { data, isLoading, isError, error, refetch, isFetching } = useAdjustments(query);
  const checker = can('admin:finance:approve');

  return (
    <>
      <PageHeader title="Finance Approvals" description="Wallet adjustments that move money. Larger amounts wait here for a second person to approve." />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 shadow-card">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <UsersIcon className="h-4 w-4" aria-hidden />
        </span>
        <div className="text-[13px]">
          <p className="font-medium text-ink">Maker–checker is enforced by the server</p>
          <p className="mt-0.5 text-ink-3">
            {checker ?
            "You won't see Approve on a request you created — and the server rejects self-approval too." :
            'Administrators can request adjustments but cannot approve them. Only a Finance Approver can approve or reject, and never their own request.'}
          </p>
        </div>
      </div>

      <Card flush>
        <SegmentedControl
          variant="underline"
          ariaLabel="Approval status"
          value={tab}
          onChange={(v) => {
            setTab(v);
            setPage(1);
          }}
          options={TABS} />

        {isError ?
        <ApiErrorState error={error} what="finance approvals" onRetry={() => refetch()} /> :

        <ApprovalsTable
          approvals={data?.items}
          loading={isLoading}
          onReview={setReviewing}
          empty={
          <EmptyState
            icon={ShieldCheckIcon}
            title={tab === 'PENDING' ? 'Nothing awaiting approval' : 'No requests here'}
            description={tab === 'PENDING' ? 'All wallet adjustments have been decided.' : 'Requests appear here once they are decided.'} />

          } />

        }
        {!isError && <Pagination meta={data?.meta} onPage={setPage} busy={isFetching} />}
      </Card>

      <Drawer
        open={Boolean(reviewing)}
        onClose={() => setReviewing(null)}
        eyebrow="Wallet adjustment"
        title={<span className="num font-mono">{reviewing ? shortId(reviewing.id) : ''}</span>}
        badge={reviewing && <StatusBadge status={reviewing.status} label={reviewing.status === 'PENDING' ? 'Awaiting approval' : titleCase(reviewing.status)} />}
        subtitle={reviewing && `${reviewing.bucket === 'AVAILABLE' ? 'Available' : 'On-hold'} balance`}>

        {reviewing &&
        <div className="space-y-6">
            <div className="rounded-lg border border-line bg-subtle/50 px-4 py-4">
              <p className="text-[12px] text-ink-3">Amount</p>
              <p className="num mt-1 text-[26px] font-semibold tracking-[-0.02em] text-ink">{formatFils(reviewing.amountMinor, { sign: true })}</p>
            </div>
            {reviewing.status === 'PENDING' && reviewing.requestedBy === user.id &&
          <div className="flex items-start gap-2 rounded-lg border border-line bg-subtle/60 px-3 py-2.5 text-[12.5px] text-ink-2">
                <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                You created this request, so it must be approved by another finance approver.
              </div>
          }
            <DetailList
            items={[
            { label: 'Request ID', value: reviewing.id, mono: true },
            { label: 'Nurse', value: reviewing.nurseId, mono: true },
            { label: 'Requested by', value: reviewing.requestedBy === user.id ? 'You' : reviewing.requestedBy, mono: reviewing.requestedBy !== user.id },
            { label: 'Created', value: formatDateTime(reviewing.createdAt) },
            { label: 'Decided by', value: reviewing.decidedBy ? reviewing.decidedBy === user.id ? 'You' : reviewing.decidedBy : <span className="text-ink-3">Pending</span>, mono: Boolean(reviewing.decidedBy && reviewing.decidedBy !== user.id) },
            { label: 'Reason', value: <span className="font-normal">{reviewing.reason}</span> },
            ...(reviewing.approvalReason ? [{ label: 'Decision note', value: <span className="font-normal">{reviewing.approvalReason}</span> }] : []),
            ...(reviewing.ledgerId ? [{ label: 'Ledger entry', value: reviewing.ledgerId, mono: true }] : [])]
            } />

          </div>
        }
      </Drawer>
    </>);

}

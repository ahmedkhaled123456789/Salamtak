import { useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, LockIcon, XIcon } from 'lucide-react';
import { DataTable } from '../ui/DataTable';
import type { Column } from '../ui/DataTable';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useSession } from '../../contexts/SessionContext';
import { useApproveAdjustment, useRejectAdjustment } from '../../hooks/mutations';
import { describeMutationError } from '../../api/errors';
import { formatFils } from '../../utils/money';
import { formatRelative } from '../../utils/date';
import { shortId, titleCase } from '../../utils/people';
import type { WalletAdjustment } from '../../api/types';

interface ApprovalsTableProps {
  approvals?: WalletAdjustment[];
  loading?: boolean;
  empty?: React.ReactNode;
  onReview: (approval: WalletAdjustment) => void;
  compact?: boolean;
}

type Pending = {approval: WalletAdjustment;decision: 'approve' | 'reject';} | null;

const bucketLabel = (a: WalletAdjustment) => (a.bucket === 'AVAILABLE' ? 'available balance' : 'on-hold balance');

export function ApprovalsTable({ approvals, loading, empty, onReview, compact = false }: ApprovalsTableProps) {
  const { user, can } = useSession();
  const approve = useApproveAdjustment();
  const reject = useRejectAdjustment();
  const [pending, setPending] = useState<Pending>(null);
  const checker = can('admin:finance:approve');

  const columns: Column<WalletAdjustment>[] = [
  {
    key: 'request',
    header: 'Request',
    cell: (a) =>
    <div>
          <p className="font-medium text-ink">Wallet adjustment</p>
          <p className="text-[12px] text-ink-3">
            <span className="num font-mono">{shortId(a.id)}</span> · {a.bucket === 'AVAILABLE' ? 'Available' : 'On hold'} · nurse <span className="num font-mono">{shortId(a.nurseId)}</span>
          </p>
        </div>

  },
  {
    key: 'createdBy',
    header: 'Requested by',
    cell: (a) =>
    a.requestedBy === user.id ?
    <span className="rounded bg-brand-soft px-1.5 text-[11px] font-semibold text-brand">You</span> :
    <span className="num font-mono text-[12px] text-ink-2" title={a.requestedBy}>{shortId(a.requestedBy)}</span>
  },
  { key: 'amount', header: 'Amount', align: 'right', cell: (a) => <span className="num font-medium">{formatFils(a.amountMinor, { sign: true })}</span> },
  ...(compact ?
  [] :
  [{ key: 'reason', header: 'Reason', cell: (a: WalletAdjustment) => <span className="block max-w-[260px] truncate text-ink-2" title={a.reason}>{a.reason}</span> }]),
  { key: 'created', header: 'Created', cell: (a) => <span className="text-ink-3">{formatRelative(a.createdAt)}</span> },
  { key: 'status', header: 'Status', cell: (a) => <StatusBadge status={a.status} label={a.status === 'PENDING' ? 'Awaiting approval' : titleCase(a.status)} /> },
  {
    key: 'action',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    cell: (a) => {
      const own = a.requestedBy === user.id;
      const decidable = a.status === 'PENDING' && checker && !own;
      return (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {a.status === 'PENDING' && own &&
          <span className="mr-1 inline-flex items-center gap-1 text-[11.5px] text-ink-3" title="Maker–checker: you can't approve a request you created">
                <LockIcon className="h-3 w-3" aria-hidden />
                Needs another approver
              </span>
          }
            <Button size="sm" variant="ghost" onClick={() => onReview(a)}>
              Review
            </Button>
            {decidable &&
          <>
                <Button size="icon-sm" variant="danger" aria-label={`Reject ${shortId(a.id)}`} onClick={() => setPending({ approval: a, decision: 'reject' })}>
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="primary" icon={<CheckIcon className="h-3.5 w-3.5" />} onClick={() => setPending({ approval: a, decision: 'approve' })}>
                  Approve
                </Button>
              </>
          }
          </div>);

    }
  }];


  const close = () => setPending(null);
  const failed = (e: unknown) => toast.error(describeMutationError(e));

  return (
    <>
      <DataTable
        columns={columns}
        rows={approvals}
        loading={loading}
        skeletonRows={3}
        getRowId={(a) => a.id}
        onRowClick={onReview}
        empty={empty}
        minWidth={compact ? 760 : 980}
        caption="Finance approvals"
        mobileRow={(a) =>
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-ink">Wallet adjustment</p>
              <p className="truncate text-[12px] text-ink-3">
                {a.reason} · by {a.requestedBy === user.id ? 'you' : shortId(a.requestedBy)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="num text-[13px] font-semibold">{formatFils(a.amountMinor, { sign: true })}</span>
              <StatusBadge status={a.status} label={a.status === 'PENDING' ? 'Awaiting approval' : titleCase(a.status)} />
            </div>
          </div>
        } />


      <ConfirmDialog
        open={Boolean(pending)}
        onClose={close}
        loading={approve.isPending || reject.isPending}
        tone={pending?.decision === 'reject' ? 'danger' : 'primary'}
        requireReason={pending?.decision === 'reject'}
        reasonLabel="Rejection note"
        title={pending?.decision === 'approve' ? 'Approve this adjustment?' : 'Reject this adjustment?'}
        confirmLabel={pending?.decision === 'approve' ? `Approve ${pending ? formatFils(pending.approval.amountMinor, { sign: true }) : ''}` : 'Reject request'}
        description={
        pending &&
        (pending.decision === 'approve' ?
        <>
                The server applies <strong>{formatFils(pending.approval.amountMinor, { sign: true })}</strong> to the nurse's {bucketLabel(pending.approval)} exactly once, as a ledger entry. Reason given: “{pending.approval.reason}”. This is recorded in the audit log and cannot be undone here.
              </> :

        <>No balance changes. The request ({formatFils(pending.approval.amountMinor, { sign: true })}) is closed as rejected and recorded in the audit log.</>)

        }
        onConfirm={(note) => {
          if (!pending) return;
          const { approval, decision } = pending;
          if (decision === 'approve') {
            approve.mutate(
              { id: approval.id, note: note || undefined },
              { onSuccess: () => {toast.success('Adjustment approved', { description: 'It has been applied to the ledger.' });close();}, onError: failed }
            );
          } else {
            reject.mutate(
              { id: approval.id, note },
              { onSuccess: () => {toast.success('Adjustment rejected', { description: 'No balance was changed.' });close();}, onError: failed }
            );
          }
        }} />

    </>);

}

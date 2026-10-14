import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { ApiErrorState } from '../ui/ApiErrorState';
import { ApprovalsTable } from '../finance/ApprovalsTable';
import { useAdjustments } from '../../hooks/queries';

export function FinanceApprovalsCard({ className }: {className?: string;}) {
  const { data, isLoading, isError, error, refetch } = useAdjustments({ status: 'PENDING', limit: 5 });
  const navigate = useNavigate();

  return (
    <Card
      className={className}
      title={
      <span className="flex items-center gap-2">
          Finance Approvals
          <span className="inline-flex items-center gap-1 rounded bg-subtle px-1.5 py-px text-[10.5px] font-medium text-ink-2">
            <UsersIcon className="h-3 w-3" aria-hidden />
            Maker–checker
          </span>
        </span>
      }
      description={data ? `${data.meta.total.toLocaleString('en-US')} awaiting a second approver` : "Money movements need a second approver who didn't create the request"}
      flush
      actions={
      <Link to="/finance/approvals" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline">
          All approvals
          <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
        </Link>
      }>

      {isError ?
      <ApiErrorState compact error={error} what="finance approvals" onRetry={() => refetch()} /> :

      <ApprovalsTable
        compact
        approvals={data?.items}
        loading={isLoading}
        onReview={() => navigate('/finance/approvals')}
        empty={<EmptyState compact icon={ShieldCheckIcon} title="No approvals waiting" description="Wallet adjustments that need a second approver will queue here." />} />

      }
    </Card>);

}

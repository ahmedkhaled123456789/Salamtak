import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, CreditCardIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { DataTable } from '../ui/DataTable';
import type { Column } from '../ui/DataTable';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/EmptyState';
import { ApiErrorState } from '../ui/ApiErrorState';
import { usePayments } from '../../hooks/queries';
import { formatFils } from '../../utils/money';
import { formatSmartDate } from '../../utils/date';
import { shortId, titleCase } from '../../utils/people';
import type { Payment } from '../../api/types';

const columns: Column<Payment>[] = [
{ key: 'ref', header: 'Reference', cell: (p) => <span className="num font-mono text-[12.5px] font-medium">{p.reference || shortId(p.id)}</span> },
{ key: 'booking', header: 'Booking', cell: (p) => <span className="num font-mono text-[12.5px] text-ink-2" title={p.bookingId}>{shortId(p.bookingId)}</span> },
{ key: 'amount', header: 'Amount', align: 'right', cell: (p) => <span className="num font-medium">{formatFils(p.amountMinor)}</span> },
{ key: 'provider', header: 'Provider', cell: (p) => <span className="text-ink-2">{titleCase(p.provider)}</span> },
{ key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
{ key: 'date', header: 'Date', cell: (p) => <span className="num text-ink-3">{formatSmartDate(p.createdAt)}</span> }];


export function RecentPayments({ className }: {className?: string;}) {
  const { data, isLoading, isError, error, refetch } = usePayments({ limit: 6 });
  const navigate = useNavigate();

  return (
    <Card
      className={className}
      title="Recent Payments"
      description="Latest payments and their provider-confirmed status"
      flush
      actions={
      <Link to="/finance/payments" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline">
          All payments
          <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
        </Link>
      }>

      {isError ?
      <ApiErrorState compact error={error} what="recent payments" onRetry={() => refetch()} /> :

      <DataTable
        columns={columns}
        rows={data?.items}
        loading={isLoading}
        getRowId={(p) => p.id}
        onRowClick={(p) => navigate(`/finance/payments?bookingId=${p.bookingId}`)}
        minWidth={680}
        caption="Recent payments"
        mobileRow={(p) =>
        <div className="flex items-center justify-between gap-3">
              <div>
                <p className="num font-mono text-[12.5px] font-medium text-ink">{p.reference || shortId(p.id)}</p>
                <p className="text-[12px] text-ink-3">{titleCase(p.provider)} · {formatSmartDate(p.createdAt)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="num text-[13px] font-semibold">{formatFils(p.amountMinor)}</span>
                <StatusBadge status={p.status} />
              </div>
            </div>
        }
        empty={<EmptyState compact icon={CreditCardIcon} title="No payments yet" description="Payments appear here once patients check out." />} />

      }
    </Card>);

}

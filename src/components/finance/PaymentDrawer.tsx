import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CopyIcon, LockIcon } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { StatusBadge } from '../ui/StatusBadge';
import { DetailList } from '../ui/DetailList';
import { formatFils, splitFils } from '../../utils/money';
import { formatDateTime } from '../../utils/date';
import { useSession } from '../../contexts/SessionContext';
import { titleCase } from '../../utils/people';
import type { Payment } from '../../api/types';

interface PaymentDrawerProps {
  payment: Payment | null;
  onClose: () => void;
}

export function PaymentDrawer({ payment, onClose }: PaymentDrawerProps) {
  const { can } = useSession();
  const amount = payment ? splitFils(payment.amountMinor) : null;
  return (
    <Drawer
      open={Boolean(payment)}
      onClose={onClose}
      eyebrow="Payment"
      title={<span className="num font-mono">{payment ? payment.reference || payment.id : ''}</span>}
      badge={payment && <StatusBadge status={payment.status} />}
      subtitle={payment && `${titleCase(payment.provider)} · Created ${formatDateTime(payment.createdAt)}`}>

      {payment && amount &&
      <div className="space-y-6">
          <div className="rounded-lg border border-line bg-subtle/50 px-4 py-4">
            <p className="text-[12px] text-ink-3">Amount</p>
            <p className="num mt-1 text-[28px] font-semibold tracking-[-0.02em] text-ink">
              <span className="mr-1.5 text-[14px] font-medium text-ink-3">{payment.currency}</span>
              {amount.major}
              <span className="text-ink-3">.{amount.minor}</span>
            </p>
            <p className="num mt-0.5 text-[11.5px] text-ink-3">{payment.amountMinor.toLocaleString('en-US')} fils (stored value)</p>
          </div>

          <DetailList
          items={[
          { label: 'Payment ID', value: payment.id, mono: true },
          { label: 'Booking', value: can('admin:bookings:read') ? <Link to={`/bookings`} onClick={onClose} className="num font-mono text-[12px] text-brand hover:underline">{payment.bookingId}</Link> : payment.bookingId, mono: !can('admin:bookings:read') },
          { label: 'Provider', value: titleCase(payment.provider) },
          {
            label: 'Provider reference',
            value:
            <span className="inline-flex items-center gap-1.5">
                    <span className="num break-all font-mono text-[12px]">{payment.reference}</span>
                    <button
                type="button"
                aria-label="Copy provider reference"
                className="rounded p-0.5 text-ink-3 hover:text-ink"
                onClick={() => {
                  void navigator.clipboard?.writeText(payment.reference);
                  toast('Reference copied');
                }}>

                      <CopyIcon className="h-3 w-3" />
                    </button>
                  </span>

          },
          { label: 'Status', value: <StatusBadge status={payment.status} /> },
          { label: 'Refunded so far', value: payment.refundedMinor > 0 ? formatFils(payment.refundedMinor) : '—' },
          ...(payment.settlement ? [{ label: 'Settlement', value: <StatusBadge status={payment.settlement} /> }] : []),
          { label: 'Paid', value: payment.paidAt ? formatDateTime(payment.paidAt) : <span className="text-ink-3">Not paid</span> },
          ...(payment.failureReason ? [{ label: 'Failure', value: <span className="font-normal text-danger">{payment.failureReason}</span> }] : [])]
          } />


          <p className="flex items-start gap-1.5 rounded-md bg-subtle/70 px-2.5 py-2 text-[11.5px] text-ink-3">
            <LockIcon className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            Payment status is set only by the provider webhook or server-side polling. Card numbers, provider secrets and raw payloads are never available here.
          </p>
        </div>
      }
    </Drawer>);

}

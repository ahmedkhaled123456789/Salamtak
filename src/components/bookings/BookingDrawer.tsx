import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarIcon, ClockIcon, ExternalLinkIcon, MapPinIcon, ShieldCheckIcon } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Avatar } from '../ui/Avatar';
import { Button, buttonClasses } from '../ui/Button';
import { StatusBadge, toneForStatus } from '../ui/StatusBadge';
import { Timeline } from '../ui/Timeline';
import { Skeleton } from '../ui/Skeleton';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ApiErrorState } from '../ui/ApiErrorState';
import { useBooking, useBookingHistory } from '../../hooks/queries';
import { useCancelBooking, useResolveBooking } from '../../hooks/mutations';
import { useSession } from '../../contexts/SessionContext';
import { describeMutationError } from '../../api/errors';
import { formatFils } from '../../utils/money';
import { formatDateTime, formatMinutes, formatTime } from '../../utils/date';
import { labelForStatus } from '../ui/StatusBadge';
import type { TimelineEvent } from '../../types/domain';
import type { BookingStatus } from '../../api/types';

/** States from which the backend will never accept an admin cancellation. The API remains the authority. */
const NOT_CANCELLABLE: BookingStatus[] = ['CANCELLED', 'EXPIRED', 'REFUNDED', 'REFUND_PENDING', 'COMPLETED', 'FAILED', 'NURSE_REJECTED'];

interface BookingDrawerProps {
  bookingId: string | null;
  onClose: () => void;
}

type Action = 'cancel' | 'resolve-refund' | 'resolve-complete' | null;

function parsePercent(text: string): number | undefined | 'invalid' {
  if (text.trim() === '') return undefined;
  if (!/^\d{1,3}$/.test(text.trim())) return 'invalid';
  const n = Number(text);
  return n >= 0 && n <= 100 ? n : 'invalid';
}

export function BookingDrawer({ bookingId, onClose }: BookingDrawerProps) {
  const { can } = useSession();
  const booking = useBooking(bookingId);
  const history = useBookingHistory(bookingId);
  const cancel = useCancelBooking();
  const resolve = useResolveBooking();
  const [action, setAction] = useState<Action>(null);
  const [percent, setPercent] = useState('');

  const b = booking.data;
  const manage = can('admin:bookings:manage');
  const parsed = parsePercent(percent);

  const events: TimelineEvent[] = (history.data ?? []).map((h, i) => ({
    id: `${h.createdAt}-${i}`,
    title: labelForStatus(h.newState),
    at: h.createdAt,
    tone: toneForStatus(h.newState),
    actor: h.actorRole === 'SYSTEM' ? 'System' : h.actorRole.charAt(0) + h.actorRole.slice(1).toLowerCase(),
    description: h.reason ?? undefined
  }));

  const closeAction = () => {
    setAction(null);
    setPercent('');
  };

  const onDone = (message: string) => {
    toast.success(message, { description: 'The booking and its refund/payment records have been refreshed.' });
    closeAction();
  };
  const onFail = (error: unknown) => toast.error(describeMutationError(error));

  return (
    <>
      <Drawer
        open={Boolean(bookingId)}
        onClose={onClose}
        eyebrow="Booking"
        title={<span className="num font-mono">{b?.bookingNumber ?? '…'}</span>}
        badge={b && <StatusBadge status={b.status} />}
        subtitle={b && `${b.service.name} · Created ${formatDateTime(b.createdAt)}`}
        footer={
        b &&
        <>
              {can('admin:finance:read') &&
          <Link to={`/finance/payments?bookingId=${b.id}`} onClick={onClose} className={buttonClasses('ghost', 'md')}>
                  View payment
                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                </Link>
          }
              {manage && b.status === 'DISPUTED' &&
          <>
                  <Button onClick={() => setAction('resolve-complete')}>Resolve: complete</Button>
                  <Button variant="danger" onClick={() => setAction('resolve-refund')}>Resolve: refund</Button>
                </>
          }
              {manage && b.status !== 'DISPUTED' && !NOT_CANCELLABLE.includes(b.status) &&
          <Button variant="danger" onClick={() => setAction('cancel')}>Cancel booking</Button>
          }
            </>

        }>

        {booking.isError ?
        <ApiErrorState error={booking.error} what="this booking" onRetry={() => booking.refetch()} compact /> :
        !b ?
        <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-40 w-full" />
          </div> :

        <div className="space-y-6">
            <section aria-label="Parties" className="grid gap-3 sm:grid-cols-2">
              {[
            { role: 'Patient', name: b.patient?.displayName ?? 'Patient' },
            { role: 'Nurse', name: b.nurse?.displayName ?? 'Not assigned yet' }].
            map((p) =>
            <div key={p.role} className="flex items-center gap-3 rounded-lg border border-line p-3">
                  <Avatar name={p.name} size="md" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">{p.role}</p>
                    <p className="truncate text-[13px] font-semibold text-ink">{p.name}</p>
                  </div>
                </div>
            )}
            </section>

            {b.statusReason &&
          <p className="rounded-lg bg-subtle/70 px-3 py-2.5 text-[12.5px] text-ink-2">
                <span className="font-medium text-ink">Status reason: </span>
                {b.statusReason}
              </p>
          }

            <section>
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">Schedule & location</h3>
              <div className="divide-y divide-line rounded-lg border border-line">
                <div className="flex items-center gap-3 px-3 py-2.5 text-[13px]">
                  <CalendarIcon className="h-4 w-4 text-ink-3" aria-hidden />
                  <span className="text-ink">{formatDateTime(b.startDateTime)}</span>
                  <span className="ml-auto text-ink-3">until {formatTime(b.endDateTime)}</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5 text-[13px]">
                  <ClockIcon className="h-4 w-4 text-ink-3" aria-hidden />
                  <span className="text-ink">{formatMinutes(b.durationMinutes)}</span>
                </div>
                <div className="flex items-center gap-3 px-3 py-2.5 text-[13px]">
                  <MapPinIcon className="h-4 w-4 text-ink-3" aria-hidden />
                  <span className="text-ink">{b.location.city ?? 'City not recorded'}</span>
                  <span className="ml-auto text-[11.5px] text-ink-3">Exact address hidden</span>
                </div>
              </div>
            </section>

            {b.pricing &&
          <section>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">Pricing</h3>
                <div className="rounded-lg border border-line">
                  <dl className="divide-y divide-dashed divide-line px-3">
                    {b.pricing.lines.map((line, i) =>
                <div key={`${line.code}-${i}`} className="flex items-center justify-between py-2.5 text-[13px]">
                        <dt className="text-ink-3">{line.label}{line.quantity !== 1 ? ` × ${line.quantity}` : ''}</dt>
                        <dd className={`num font-medium ${line.code === 'DISCOUNT' ? 'text-success' : 'text-ink'}`}>{formatFils(line.amountMinor)}</dd>
                      </div>
                )}
                    {b.pricing.couponCode &&
                <div className="flex items-center justify-between py-2.5 text-[13px]">
                        <dt className="text-ink-3">Coupon</dt>
                        <dd className="num font-mono text-[12px] font-medium text-ink">{b.pricing.couponCode}</dd>
                      </div>
                }
                    {b.earnings &&
                <div className="flex items-center justify-between py-2.5 text-[13px]">
                        <dt className="text-ink-3">Nurse earnings</dt>
                        <dd className="num font-medium text-ink">{formatFils(b.earnings.nurseEarningMinor)}</dd>
                      </div>
                }
                    {b.refund && b.refund.status !== 'NONE' &&
                <div className="flex items-center justify-between py-2.5 text-[13px]">
                        <dt className="text-ink-3">Refund ({b.refund.percent}% · {labelForStatus(b.refund.status)})</dt>
                        <dd className="num font-medium text-ink">{formatFils(-b.refund.amountMinor)}</dd>
                      </div>
                }
                  </dl>
                  <div className="flex items-center justify-between rounded-b-lg border-t border-line bg-subtle/60 px-3 py-3">
                    <span className="text-[13px] font-medium text-ink">Patient payable</span>
                    <span className="num text-[16px] font-semibold text-ink">{formatFils(b.pricing.patientPayableMinor)}</span>
                  </div>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-ink-3">
                  <ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden />
                  Every amount is calculated by the server ({b.pricing.pricingVersion}) and shown read-only.
                </p>
              </section>
          }

            <section>
              <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">Status history</h3>
              {history.isError ?
            <ApiErrorState error={history.error} what="the status history" onRetry={() => history.refetch()} compact /> :
            history.isLoading ?
            <Skeleton className="h-24 w-full" /> :
            events.length === 0 ?
            <p className="text-[12.5px] text-ink-3">No status changes recorded.</p> :

            <Timeline events={events} />
            }
            </section>
          </div>
        }
      </Drawer>

      <ConfirmDialog
        open={action === 'cancel'}
        onClose={closeAction}
        tone="danger"
        requireReason
        loading={cancel.isPending}
        title={`Cancel booking ${b?.bookingNumber ?? ''}?`}
        description="The booking is cancelled and the server applies its cancellation policy to decide any refund. This cannot be undone."
        confirmLabel="Cancel booking"
        onConfirm={(reason) => {
          if (!b || parsed === 'invalid') return;
          cancel.mutate({ id: b.id, reason, refundPercent: parsed }, { onSuccess: () => onDone('Booking cancelled'), onError: onFail });
        }}>

        <RefundOverride value={percent} onChange={setPercent} invalid={parsed === 'invalid'} />
      </ConfirmDialog>

      <ConfirmDialog
        open={action === 'resolve-complete' || action === 'resolve-refund'}
        onClose={closeAction}
        tone={action === 'resolve-refund' ? 'danger' : 'primary'}
        requireReason
        loading={resolve.isPending}
        title={action === 'resolve-refund' ? `Resolve ${b?.bookingNumber ?? ''} with a refund?` : `Resolve ${b?.bookingNumber ?? ''} as completed?`}
        description={action === 'resolve-refund' ? 'The dispute is closed in the patient’s favour and the refund is processed by the server.' : 'The dispute is closed and the visit counts as completed, so the nurse is paid.'}
        confirmLabel={action === 'resolve-refund' ? 'Resolve with refund' : 'Resolve as completed'}
        onConfirm={(reason) => {
          if (!b || parsed === 'invalid') return;
          const resolution = action === 'resolve-refund' ? 'REFUND' : 'COMPLETE';
          resolve.mutate(
            { id: b.id, resolution, reason, refundPercent: resolution === 'REFUND' ? parsed : undefined },
            { onSuccess: () => onDone('Dispute resolved'), onError: onFail }
          );
        }}>

        {action === 'resolve-refund' && <RefundOverride value={percent} onChange={setPercent} invalid={parsed === 'invalid'} />}
      </ConfirmDialog>
    </>);

}

function RefundOverride({ value, onChange, invalid }: {value: string;onChange: (v: string) => void;invalid: boolean;}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Refund % override (optional)</span>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Leave empty to apply the standard policy"
        aria-invalid={invalid}
        className="h-9 w-full rounded-md border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-ink-3 focus:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15" />

      {invalid && <span className="mt-1 block text-[11.5px] text-danger">Enter a whole number from 0 to 100.</span>}
    </label>);

}

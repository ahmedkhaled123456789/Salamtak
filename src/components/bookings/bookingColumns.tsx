import type { Column } from '../ui/DataTable';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/StatusBadge';
import { formatFils } from '../../utils/money';
import { formatSmartDate } from '../../utils/date';
import type { Booking } from '../../api/types';

const patientName = (b: Booking) => b.patient?.displayName ?? 'Patient';
const nurseName = (b: Booking) => b.nurse?.displayName ?? 'Not assigned';
const amount = (b: Booking) => (b.pricing ? formatFils(b.pricing.patientPayableMinor) : '—');

export const bookingColumns: Column<Booking>[] = [
{ key: 'id', header: 'Booking', cell: (b) => <span className="num font-mono text-[12.5px] font-medium text-ink">{b.bookingNumber}</span> },
{
  key: 'patient',
  header: 'Patient',
  cell: (b) =>
  <div className="flex items-center gap-2">
        <Avatar name={patientName(b)} size="xs" />
        <span className="font-medium">{patientName(b)}</span>
      </div>

},
{ key: 'nurse', header: 'Nurse', cell: (b) => <span className="text-ink-2">{nurseName(b)}</span> },
{ key: 'service', header: 'Service', cell: (b) => <span className="text-ink-2">{b.service.name}</span> },
{ key: 'date', header: 'Visit', cell: (b) => <span className="num text-ink-2">{formatSmartDate(b.startDateTime)}</span> },
{ key: 'amount', header: 'Amount', align: 'right', cell: (b) => <span className="num font-medium">{amount(b)}</span> },
{ key: 'status', header: 'Status', cell: (b) => <StatusBadge status={b.status} /> }];


export function renderBookingMobileRow(b: Booking) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">{patientName(b)}</p>
        <p className="truncate text-[12px] text-ink-3">
          <span className="num font-mono">{b.bookingNumber}</span> · {b.service.name}
        </p>
        <p className="num mt-0.5 text-[12px] text-ink-3">
          {formatSmartDate(b.startDateTime)} · {nurseName(b)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="num text-[13px] font-semibold">{amount(b)}</span>
        <StatusBadge status={b.status} />
      </div>
    </div>);

}

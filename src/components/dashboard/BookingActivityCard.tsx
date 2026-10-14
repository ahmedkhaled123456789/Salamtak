import { Link } from 'react-router-dom';
import { ChartNoAxesColumnIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Unavailable } from '../ui/Unavailable';

/** The backend has no booking-status aggregate or time series, so this card says so instead of drawing one. */
export function BookingActivityCard({ className }: {className?: string;}) {
  return (
    <Card
      className={className}
      title="Booking Activity"
      actions={<Link to="/bookings" className="text-[12.5px] font-medium text-brand hover:underline">Open bookings</Link>}>

      <Unavailable
        icon={ChartNoAxesColumnIcon}
        title="Booking trends aren't available yet"
        description="The backend can list bookings by status, but doesn't provide status distribution, daily averages or revenue trends. Use the Bookings page to filter by status." />

    </Card>);

}

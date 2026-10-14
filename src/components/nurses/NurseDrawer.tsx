import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MailIcon, MapPinIcon, PhoneIcon, StarIcon } from 'lucide-react';
import { Drawer } from '../ui/Drawer';
import { Avatar } from '../ui/Avatar';
import { Button, buttonClasses } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { DetailList } from '../ui/DetailList';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Skeleton } from '../ui/Skeleton';
import { useBookings, useWallet } from '../../hooks/queries';
import { useReactivateNurse, useSuspendNurse, useUploadUserAvatar } from '../../hooks/mutations';
import { ImageUploadButton } from '../ui/ImageUploadButton';
import { resolveBackendUrl } from '../../api/client';
import { useSession } from '../../contexts/SessionContext';
import { describeMutationError, normalizeError } from '../../api/errors';
import { formatFils } from '../../utils/money';
import { formatDate, formatSmartDate } from '../../utils/date';
import { nurseName, titleCase } from '../../utils/people';
import type { NurseProfile } from '../../api/types';

interface NurseDrawerProps {
  nurse: NurseProfile | null;
  onClose: () => void;
}

export function NurseDrawer({ nurse, onClose }: NurseDrawerProps) {
  const { can } = useSession();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const suspend = useSuspendNurse();
  const reactivate = useReactivateNurse();
  const uploadPhoto = useUploadUserAvatar();
  const recent = useBookings({ nurseId: nurse?.id, limit: 3 }, Boolean(nurse) && can('admin:bookings:read'));
  const wallet = useWallet(nurse && can('admin:finance:read') ? nurse.id : null);

  const suspended = nurse?.status === 'SUSPENDED';
  const canSuspend = can('admin:nurses:suspend');
  const name = nurse ? nurseName(nurse) : '';

  const finish = (message: string) => {
    toast.success(message);
    setConfirmOpen(false);
  };

  return (
    <>
      <Drawer
        open={Boolean(nurse)}
        onClose={onClose}
        eyebrow="Nurse profile"
        title={name}
        badge={nurse && <StatusBadge status={nurse.verificationStatus} />}
        subtitle={nurse && `${nurse.city ?? 'City not recorded'} · Joined ${formatDate(nurse.createdAt)}`}
        footer={
        nurse &&
        <>
              {can('admin:bookings:read') &&
          <Link to={`/bookings?nurseId=${nurse.id}`} onClick={onClose} className={buttonClasses('ghost', 'md')}>
                  All bookings
                </Link>
          }
              {nurse.verificationStatus === 'UNDER_REVIEW' && can('admin:nurse-documents:review') &&
          <Link to={`/operations/verification?nurse=${nurse.id}`} onClick={onClose} className={buttonClasses('secondary', 'md')}>
                  Open verification
                </Link>
          }
              {canSuspend &&
          <Button variant={suspended ? 'secondary' : 'danger'} onClick={() => setConfirmOpen(true)}>
                  {suspended ? 'Reactivate' : 'Suspend'}
                </Button>
          }
            </>

        }>

        {nurse &&
        <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                {nurse.user?.photoUrl ?
              <img src={resolveBackendUrl(nurse.user.photoUrl)} alt={`Photo of ${name}`} className="h-16 w-16 rounded-full object-cover ring-1 ring-line" /> :
              <Avatar name={name} size="xl" />
              }
                {can('admin:media:manage') && nurse.userId &&
              <ImageUploadButton
                label={nurse.user?.photoUrl ? 'Change photo' : 'Add photo'}
                maxBytes={5 * 1024 * 1024}
                busy={uploadPhoto.isPending}
                successMessage="Photo updated — it now shows on the website and app"
                onFile={(file) => uploadPhoto.mutateAsync({ userId: nurse.userId, file })} />
              }
              </div>
              <div className="space-y-1 text-[12.5px] text-ink-2">
                <p className="flex items-center gap-2"><MapPinIcon className="h-3.5 w-3.5 text-ink-3" aria-hidden />{nurse.city ?? '—'}{nurse.country ? `, ${nurse.country}` : ''}</p>
                {nurse.user?.phone && <p className="flex items-center gap-2"><PhoneIcon className="h-3.5 w-3.5 text-ink-3" aria-hidden /><span className="num">{nurse.user.phone}</span></p>}
                {nurse.user?.email && <p className="flex items-center gap-2"><MailIcon className="h-3.5 w-3.5 text-ink-3" aria-hidden />{nurse.user.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-line rounded-lg border border-line">
              <div className="px-3 py-3">
                <p className="text-[11.5px] text-ink-3">Rating</p>
                <p className="num mt-0.5 flex items-center gap-1 text-[17px] font-semibold text-ink">
                  {nurse.totalReviews > 0 ? nurse.averageRating.toFixed(2) : '—'}
                  {nurse.totalReviews > 0 && <StarIcon className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden />}
                </p>
                <p className="text-[11px] text-ink-3">{nurse.totalReviews} reviews</p>
              </div>
              <div className="px-3 py-3">
                <p className="text-[11.5px] text-ink-3">Completed</p>
                <p className="num mt-0.5 text-[17px] font-semibold text-ink">{nurse.totalCompletedBookings}</p>
                <p className="text-[11px] text-ink-3">bookings</p>
              </div>
              <div className="px-3 py-3">
                <p className="text-[11.5px] text-ink-3">Lifetime earned</p>
                {can('admin:finance:read') ?
              wallet.isLoading ? <Skeleton className="mt-1 h-5 w-20" /> :
              wallet.data ?
              <p className="num mt-0.5 text-[17px] font-semibold text-ink">{formatFils(wallet.data.totalEarnedMinor, { decimals: false })}</p> :
              <p className="mt-0.5 text-[13px] text-ink-3">{wallet.isError && normalizeError(wallet.error).status === 404 ? 'No wallet yet' : 'Unavailable'}</p> :
              <p className="mt-0.5 text-[13px] text-ink-3">No access</p>}
                <p className="text-[11px] text-ink-3">ledger value</p>
              </div>
            </div>

            <section>
              <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">Professional</h3>
              <DetailList
              items={[
              { label: 'Account status', value: <StatusBadge status={nurse.status} /> },
              ...(nurse.statusReason ? [{ label: 'Status reason', value: <span className="font-normal">{nurse.statusReason}</span> }] : []),
              { label: 'Accepting bookings', value: nurse.isBookable ? 'Yes' : 'No' },
              { label: 'Experience', value: `${nurse.yearsOfExperience} years` },
              { label: 'Languages', value: nurse.languages.length ? nurse.languages.join(', ') : '—' },
              { label: 'Gender', value: nurse.gender ? titleCase(nurse.gender) : '—' },
              { label: 'Service radius', value: `${nurse.serviceRadiusKm} km` }]
              } />

            </section>

            {nurse.specializations.length > 0 &&
          <section>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">Specializations</h3>
                <div className="flex flex-wrap gap-1.5">
                  {nurse.specializations.map((s) =>
              <span key={s} className="rounded-md border border-line bg-subtle/60 px-2 py-1 text-[12px] text-ink-2">{s}</span>
              )}
                </div>
              </section>
          }

            {can('admin:bookings:read') &&
          <section>
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-3">Recent bookings</h3>
                {recent.isLoading ?
            <Skeleton className="h-16 w-full" /> :
            recent.isError ?
            <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[12.5px] text-ink-3">Couldn't load bookings.</p> :
            !recent.data || recent.data.items.length === 0 ?
            <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-[12.5px] text-ink-3">No bookings yet.</p> :

            <ul className="divide-y divide-line rounded-lg border border-line">
                    {recent.data.items.map((b) =>
              <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[12.5px]">
                        <div>
                          <p className="font-medium text-ink"><span className="num font-mono">{b.bookingNumber}</span> · {b.patient?.displayName ?? 'Patient'}</p>
                          <p className="num text-ink-3">{formatSmartDate(b.startDateTime)}</p>
                        </div>
                        <StatusBadge status={b.status} />
                      </li>
              )}
                  </ul>
            }
              </section>
          }
          </div>
        }
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        tone={suspended ? 'primary' : 'danger'}
        requireReason={!suspended}
        loading={suspend.isPending || reactivate.isPending}
        title={suspended ? `Reactivate ${name}?` : `Suspend ${name}?`}
        description={suspended ? 'They can receive booking requests again once their verification and availability allow it.' : 'They stop receiving new booking requests. The server decides what happens to bookings already confirmed.'}
        confirmLabel={suspended ? 'Reactivate nurse' : 'Suspend nurse'}
        onConfirm={(reason) => {
          if (!nurse) return;
          if (suspended) {
            reactivate.mutate({ id: nurse.id }, { onSuccess: () => finish('Nurse reactivated'), onError: (e) => toast.error(describeMutationError(e)) });
          } else {
            suspend.mutate({ id: nurse.id, reason }, { onSuccess: () => finish('Nurse suspended'), onError: (e) => toast.error(describeMutationError(e)) });
          }
        }} />

    </>);

}

import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, BadgeCheckIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Button, buttonClasses } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { ApiErrorState } from '../ui/ApiErrorState';
import { useNurses } from '../../hooks/queries';
import { formatRelative } from '../../utils/date';
import { nurseName } from '../../utils/people';

export function VerificationQueue({ className }: {className?: string;}) {
  const { data, isLoading, isError, error, refetch } = useNurses({ verificationStatus: 'UNDER_REVIEW', limit: 4 });
  const navigate = useNavigate();

  return (
    <Card
      className={className}
      title="Nurse Verification"
      description={data ? `${data.meta.total.toLocaleString('en-US')} awaiting review` : 'Awaiting review'}
      flush
      footer={
      <Link to="/operations/verification" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline">
          Open review workspace
          <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
        </Link>
      }>

      {isError ?
      <ApiErrorState compact error={error} what="the verification queue" onRetry={() => refetch()} /> :
      isLoading ?
      <div className="space-y-4 px-5 pb-5">
          {Array.from({ length: 4 }).map((_, i) =>
        <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-20" /></div>
              <Skeleton className="h-8 w-16" />
            </div>
        )}
        </div> :
      !data || data.items.length === 0 ?
      <EmptyState
        compact
        icon={BadgeCheckIcon}
        title="No pending verification"
        description="No nurse is waiting for review."
        action={<Link to="/nurses" className={buttonClasses('secondary', 'sm')}>View Nurses</Link>} /> :


      <ul className="divide-y divide-line border-t border-line">
          {data.items.map((n) =>
        <li key={n.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={nurseName(n)} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">{nurseName(n)}</p>
                <p className="text-[12px] text-ink-3">{n.yearsOfExperience}y experience{n.city ? ` · ${n.city}` : ''}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Button size="sm" onClick={() => navigate(`/operations/verification?nurse=${n.id}`)}>Review</Button>
                <span className="text-[10.5px] text-ink-3">{formatRelative(n.updatedAt)}</span>
              </div>
            </li>
        )}
        </ul>
      }
    </Card>);

}

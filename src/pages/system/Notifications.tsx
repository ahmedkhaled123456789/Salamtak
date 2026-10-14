import { useState } from 'react';
import { toast } from 'sonner';
import { BellIcon, CheckCheckIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Pagination } from '../../components/ui/Pagination';
import { useNotifications, useUnreadCount } from '../../hooks/queries';
import { useMarkAllNotificationsRead } from '../../hooks/mutations';
import { describeMutationError } from '../../api/errors';
import { formatRelative } from '../../utils/date';
import { cn } from '../../utils/cn';

/** The signed-in administrator's own notifications (GET /notifications). Not an outbound delivery log. */
export function Notifications() {
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch, isFetching } = useNotifications({ page, limit: 20, unread: tab === 'unread' ? true : undefined });
  const unread = useUnreadCount();
  const markAll = useMarkAllNotificationsRead();

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Alerts addressed to your account."
        actions={
        <Button
          icon={<CheckCheckIcon className="h-3.5 w-3.5" />}
          loading={markAll.isPending}
          disabled={!unread.data?.unread}
          onClick={() => markAll.mutate(undefined, { onSuccess: () => toast.success('All notifications marked as read'), onError: (e) => toast.error(describeMutationError(e)) })}>

            Mark all as read
          </Button>
        } />

      <Card flush>
        <SegmentedControl
          variant="underline"
          ariaLabel="Notification filter"
          value={tab}
          onChange={(v) => {
            setTab(v);
            setPage(1);
          }}
          options={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread', count: unread.data?.unread }]} />

        {isError ?
        <ApiErrorState error={error} what="notifications" onRetry={() => refetch()} /> :
        isLoading ?
        <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div> :
        !data || data.items.length === 0 ?
        <EmptyState icon={BellIcon} title={tab === 'unread' ? 'Nothing unread' : 'No notifications'} description="New alerts addressed to you appear here." /> :

        <ul className="divide-y divide-line">
            {data.items.map((n) =>
          <li key={n.id} className="flex gap-3 px-5 py-3.5">
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand')} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-[13px]', n.read ? 'text-ink-2' : 'font-medium text-ink')}>{n.title}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-3">{n.body}</p>
                </div>
                <span className="shrink-0 text-[11.5px] text-ink-3">{formatRelative(n.createdAt)}</span>
              </li>
          )}
          </ul>
        }
        {!isError && <Pagination meta={data?.meta} onPage={setPage} busy={isFetching} />}
      </Card>
    </>);

}

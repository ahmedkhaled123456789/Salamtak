import { useNavigate } from 'react-router-dom';
import { BellIcon } from 'lucide-react';
import { Dropdown } from '../ui/Dropdown';
import { useNotifications, useUnreadCount } from '../../hooks/queries';
import { formatRelative } from '../../utils/date';
import { cn } from '../../utils/cn';

/** The signed-in administrator's own notifications (GET /notifications). */
export function NotificationsMenu() {
  const { data, isError } = useNotifications({ limit: 8 });
  const { data: unreadData } = useUnreadCount();
  const navigate = useNavigate();
  const unread = unreadData?.unread ?? 0;

  return (
    <Dropdown
      ariaLabel={`Notifications${unread ? `, ${unread} unread` : ''}`}
      widthClassName="w-[340px]"
      triggerClassName="relative flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
      trigger={
      <>
          <BellIcon className="h-4 w-4" strokeWidth={1.9} />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface" aria-hidden />}
        </>
      }>

      {(close) =>
      <div>
          <div className="flex items-center justify-between px-2.5 pb-2 pt-1.5">
            <p className="text-[13px] font-semibold text-ink">Notifications</p>
            <span className="text-[11.5px] text-ink-3">{unread} unread</span>
          </div>
          <div className="-mx-1 h-px bg-line" />
          {isError ?
        <p className="px-2.5 py-6 text-center text-[12.5px] text-ink-3">Couldn't load notifications.</p> :
        data && data.items.length > 0 ?
        <ul className="py-1">
              {data.items.map((n) =>
          <li key={n.id}>
                  <button
              type="button"
              onClick={() => {
                navigate('/operations/notifications');
                close();
              }}
              className="flex w-full gap-3 rounded-md px-2.5 py-2 text-left hover:bg-subtle">

                    <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-brand')} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-[12.5px]', n.read ? 'text-ink-2' : 'font-medium text-ink')}>{n.title}</span>
                      <span className="line-clamp-2 block text-[11.5px] text-ink-3">{n.body}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-ink-3">{formatRelative(n.createdAt).replace(' ago', '')}</span>
                  </button>
                </li>
          )}
            </ul> :

        <p className="px-2.5 py-6 text-center text-[12.5px] text-ink-3">{data ? "You're all caught up." : 'Loading…'}</p>
        }
        </div>
      }
    </Dropdown>);

}

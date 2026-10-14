import { useState } from 'react';
import { LockIcon, MessagesSquareIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Pagination } from '../../components/ui/Pagination';
import { useConversations } from '../../hooks/queries';
import { formatRelative } from '../../utils/date';
import type { Conversation } from '../../api/types';

const columns: Column<Conversation>[] = [
{ key: 'type', header: 'Type', cell: (c) => <StatusBadge status={c.type === 'SUPPORT' ? 'info' : 'neutral'} label={c.type === 'SUPPORT' ? 'Support' : 'Booking'} dot={false} /> },
{ key: 'with', header: 'With', cell: (c) => <span className="font-medium text-ink">{c.counterpart}</span> },
{ key: 'booking', header: 'Booking', cell: (c) => <span className="num font-mono text-[12.5px] text-ink-2">{c.bookingNumber ?? '—'}</span> },
{ key: 'unread', header: 'Unread', align: 'right', cell: (c) => <span className={c.unread > 0 ? 'num font-semibold text-brand' : 'num text-ink-3'}>{c.unread}</span> },
{ key: 'last', header: 'Last message', cell: (c) => <span className="text-ink-3">{c.lastMessageAt ? formatRelative(c.lastMessageAt) : 'No messages'}</span> }];


/** Support-conversation inbox (metadata only). Message text is never loaded in this dashboard. */
export function Conversations() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch, isFetching } = useConversations({ page, limit: 20 });

  return (
    <>
      <PageHeader title="Conversations" description="Support conversations assigned to administrators. Only who and when are shown here." />
      <p className="mb-4 flex items-start gap-1.5 rounded-md bg-subtle/70 px-3 py-2.5 text-[12px] text-ink-3">
        <LockIcon className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        Message content is private. Reading and replying to messages isn't part of this dashboard yet.
      </p>
      <Card flush>
        {isError ?
        <ApiErrorState error={error} what="conversations" onRetry={() => refetch()} /> :

        <DataTable
          columns={columns}
          rows={data?.items}
          loading={isLoading}
          getRowId={(c) => c.id}
          minWidth={640}
          caption="Conversations"
          mobileRow={(c) =>
          <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-ink">{c.counterpart}</p>
                  <p className="text-[12px] text-ink-3">{c.type === 'SUPPORT' ? 'Support' : c.bookingNumber ?? 'Booking'} · {c.lastMessageAt ? formatRelative(c.lastMessageAt) : 'No messages'}</p>
                </div>
                {c.unread > 0 && <span className="num rounded bg-brand-soft px-1.5 text-[11px] font-semibold text-brand">{c.unread}</span>}
              </div>
          }
          empty={<EmptyState icon={MessagesSquareIcon} title="No conversations" description="Support requests from patients and nurses appear here." />} />

        }
        {!isError && <Pagination meta={data?.meta} onPage={setPage} busy={isFetching} />}
      </Card>
    </>);

}

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckIcon, InboxIcon, MailIcon, NewspaperIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { FilterBar } from '../../components/ui/FilterBar';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Pagination } from '../../components/ui/Pagination';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SummaryStrip } from '../../components/ui/SummaryStrip';
import { Drawer } from '../../components/ui/Drawer';
import { DetailList } from '../../components/ui/DetailList';
import { useContactMessages, useInboxCounts, useSubscribers } from '../../hooks/queries';
import { useHandleContactMessage } from '../../hooks/mutations';
import { useListState } from '../../hooks/useListState';
import { describeMutationError } from '../../api/errors';
import { formatDateTime, formatRelative } from '../../utils/date';
import type { ContactMessage, NewsletterSubscriber } from '../../api/types';

const TOPIC: Record<ContactMessage['topic'], string> = { CARE: 'Finding care', BOOKING: 'Existing booking', PARTNER: 'Joining as a professional', OTHER: 'Other' };

/** Contact-form messages (reply by email, then mark handled — audit-logged) and newsletter subscribers. */
export function Inbox() {
  const [tab, setTab] = useState<'messages' | 'subscribers'>('messages');
  const counts = useInboxCounts();
  return (
    <>
      <PageHeader title="Inbox" description="Messages from the website and app contact forms, and newsletter subscribers (double opt-in)." />
      <SummaryStrip
        className="mb-5"
        loading={counts.isLoading}
        items={[
        { label: 'Unhandled messages', value: counts.data ? counts.data.newContactMessages : '—', tone: counts.data?.newContactMessages ? 'warning' : undefined },
        { label: 'Confirmed subscribers', value: counts.data ? counts.data.subscribers.toLocaleString('en-US') : '—', hint: 'Confirmed by email' }]
        } />
      <SegmentedControl
        ariaLabel="Inbox section"
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[{ value: 'messages', label: 'Contact messages' }, { value: 'subscribers', label: 'Newsletter' }]} />
      {tab === 'messages' ? <Messages /> : <Subscribers />}
    </>);

}

function Messages() {
  const list = useListState({ status: 'NEW' });
  const [open, setOpen] = useState<ContactMessage | null>(null);
  const [note, setNote] = useState('');
  const handle = useHandleContactMessage();
  const query = useMemo(
    () => ({ page: list.page, limit: list.limit, status: list.filters.status === 'all' ? undefined : list.filters.status as ContactMessage['status'] }),
    [list.page, list.limit, list.filters.status]
  );
  const { data, isLoading, isError, error, refetch, isFetching } = useContactMessages(query);

  const columns: Column<ContactMessage>[] = [
  { key: 'from', header: 'From', cell: (m) => <div><p className="font-medium text-ink">{m.name}</p><p className="text-[12px] text-ink-3">{m.email}</p></div> },
  { key: 'topic', header: 'Topic', cell: (m) => <span className="text-ink-2">{TOPIC[m.topic]}</span> },
  { key: 'message', header: 'Message', cell: (m) => <p className="max-w-[360px] truncate text-ink-2" dir="auto">{m.message}</p> },
  { key: 'received', header: 'Received', cell: (m) => <span className="num text-ink-2" title={formatDateTime(m.createdAt)}>{formatRelative(m.createdAt)}</span> },
  { key: 'status', header: 'Status', cell: (m) => <StatusBadge status={m.status === 'NEW' ? 'pending' : 'completed'} label={m.status === 'NEW' ? 'New' : 'Handled'} /> }];


  const close = () => {
    setOpen(null);
    setNote('');
  };

  return (
    <Card flush>
      <FilterBar
        className="pt-4"
        activeCount={list.activeCount}
        onClear={list.reset}
        actions={data ? <span className="num text-[12px] text-ink-3">{data.meta.total.toLocaleString('en-US')} messages</span> : undefined}>
        <Select label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={[{ value: 'NEW', label: 'New' }, { value: 'HANDLED', label: 'Handled' }, { value: 'all', label: 'All' }]} />
      </FilterBar>
      {isError ?
      <ApiErrorState error={error} what="messages" onRetry={() => refetch()} /> :
      <DataTable
        columns={columns}
        rows={data?.items}
        loading={isLoading}
        getRowId={(m) => m.id}
        onRowClick={setOpen}
        minWidth={880}
        caption="Contact messages"
        mobileRow={(m) =>
        <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{m.name}</p>
                <p className="truncate text-[12px] text-ink-3" dir="auto">{m.message}</p>
              </div>
              <StatusBadge status={m.status === 'NEW' ? 'pending' : 'completed'} label={m.status === 'NEW' ? 'New' : 'Handled'} />
            </div>
        }
        empty={<EmptyState icon={InboxIcon} title={list.filters.status === 'NEW' ? 'Nothing waiting' : 'No messages'} description="New contact-form messages appear here." />} />
      }
      {!isError && <Pagination meta={data?.meta} onPage={list.setPage} busy={isFetching} />}

      <Drawer
        open={Boolean(open)}
        onClose={close}
        eyebrow={open ? TOPIC[open.topic] : undefined}
        title={open?.name ?? ''}
        subtitle={open ? formatDateTime(open.createdAt) : undefined}
        badge={open ? <StatusBadge status={open.status === 'NEW' ? 'pending' : 'completed'} label={open.status === 'NEW' ? 'New' : 'Handled'} /> : undefined}
        footer={
        open?.status === 'NEW' ?
        <div className="flex w-full flex-col gap-3">
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Note (optional, audit-logged)</span>
                <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="e.g. Replied by email, booking arranged"
              className="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-ink-3 focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/15" />
              </label>
              <div className="flex justify-end gap-2">
                <a className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] font-medium text-ink hover:bg-subtle" href={`mailto:${open.email}`}>
                  <MailIcon className="h-3.5 w-3.5" aria-hidden />
                  Reply by email
                </a>
                <Button
              variant="primary"
              icon={<CheckIcon className="h-3.5 w-3.5" />}
              loading={handle.isPending}
              onClick={() =>
              handle.mutate(
                { id: open.id, note: note.trim() || undefined },
                {
                  onSuccess: () => {
                    toast.success('Marked as handled');
                    close();
                  },
                  onError: (e) => toast.error(describeMutationError(e))
                }
              )
              }>
                  Mark handled
                </Button>
              </div>
            </div> :
        undefined
        }>
        {open &&
        <div className="space-y-5">
            <DetailList
            items={[
            { label: 'Email', value: <a className="text-brand hover:underline" href={`mailto:${open.email}`}>{open.email}</a> },
            { label: 'Phone', value: open.phone ?? '—' },
            { label: 'Language', value: open.locale === 'ar' ? 'Arabic' : 'English' },
            ...(open.handledAt ? [{ label: 'Handled', value: formatDateTime(open.handledAt) }] : []),
            ...(open.note ? [{ label: 'Note', value: open.note }] : [])]
            } />
            <div>
              <p className="mb-1.5 text-[12.5px] font-medium text-ink-2">Message</p>
              <p className="whitespace-pre-wrap rounded-md border border-line bg-subtle/40 p-3 text-[13.5px] leading-relaxed text-ink" dir="auto">{open.message}</p>
            </div>
          </div>
        }
      </Drawer>
    </Card>);

}

function Subscribers() {
  const list = useListState({ status: 'SUBSCRIBED' });
  const query = useMemo(
    () => ({ page: list.page, limit: list.limit, status: list.filters.status === 'all' ? undefined : list.filters.status as NewsletterSubscriber['status'] }),
    [list.page, list.limit, list.filters.status]
  );
  const { data, isLoading, isError, error, refetch, isFetching } = useSubscribers(query);
  const columns: Column<NewsletterSubscriber>[] = [
  { key: 'email', header: 'Email', cell: (s) => <span className="font-medium text-ink">{s.email}</span> },
  { key: 'locale', header: 'Language', cell: (s) => <span className="text-ink-2">{s.locale === 'ar' ? 'Arabic' : 'English'}</span> },
  { key: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status === 'SUBSCRIBED' ? 'active' : s.status === 'PENDING' ? 'pending' : 'inactive'} label={s.status === 'SUBSCRIBED' ? 'Subscribed' : s.status === 'PENDING' ? 'Awaiting confirmation' : 'Unsubscribed'} /> },
  { key: 'consent', header: 'Consent given', cell: (s) => <span className="num text-ink-2">{s.consentAt ? formatDateTime(s.consentAt) : '—'}</span> }];

  return (
    <Card flush>
      <FilterBar
        className="pt-4"
        activeCount={list.activeCount}
        onClear={list.reset}
        actions={data ? <span className="num text-[12px] text-ink-3">{data.meta.total.toLocaleString('en-US')} addresses</span> : undefined}>
        <Select
          label="Status"
          value={list.filters.status}
          onChange={(v) => list.setFilter('status', v)}
          options={[{ value: 'SUBSCRIBED', label: 'Subscribed' }, { value: 'PENDING', label: 'Awaiting confirmation' }, { value: 'UNSUBSCRIBED', label: 'Unsubscribed' }, { value: 'all', label: 'All' }]} />
      </FilterBar>
      {isError ?
      <ApiErrorState error={error} what="subscribers" onRetry={() => refetch()} /> :
      <DataTable
        columns={columns}
        rows={data?.items}
        loading={isLoading}
        getRowId={(s) => s.id}
        minWidth={720}
        caption="Newsletter subscribers"
        mobileRow={(s) => <div className="flex items-center justify-between gap-3"><p className="truncate font-medium text-ink">{s.email}</p><span className="text-[12px] text-ink-3">{s.status.toLowerCase()}</span></div>}
        empty={<EmptyState icon={NewspaperIcon} title="No subscribers" description="Addresses appear here after someone signs up on the website or app." />} />
      }
      {!isError && <Pagination meta={data?.meta} onPage={list.setPage} busy={isFetching} />}
    </Card>);

}

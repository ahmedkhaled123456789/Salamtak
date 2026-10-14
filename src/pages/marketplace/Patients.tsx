import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BanIcon, CalendarCheckIcon, EllipsisIcon, UsersIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { FilterBar } from '../../components/ui/FilterBar';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Dropdown } from '../../components/ui/Dropdown';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Pagination } from '../../components/ui/Pagination';
import { useUsers } from '../../hooks/queries';
import { useSetUserBlocked } from '../../hooks/mutations';
import { useDebounced } from '../../hooks/useDebounced';
import { useListState } from '../../hooks/useListState';
import { useSession } from '../../contexts/SessionContext';
import { describeMutationError } from '../../api/errors';
import { formatDate, formatRelative } from '../../utils/date';
import type { AdminUser } from '../../api/types';

const fullName = (u: AdminUser) => `${u.firstName} ${u.lastName}`.trim();

export function Patients() {
  const navigate = useNavigate();
  const { can } = useSession();
  const list = useListState({ status: 'all' });
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search.trim());
  const [target, setTarget] = useState<AdminUser | null>(null);
  const block = useSetUserBlocked();

  const query = useMemo(
    () => ({
      page: list.page,
      limit: list.limit,
      role: 'PATIENT' as const,
      search: debounced || undefined,
      isActive: list.filters.status === 'all' ? undefined : list.filters.status === 'active'
    }),
    [list.page, list.limit, list.filters.status, debounced]
  );
  const { data, isLoading, isError, error, refetch, isFetching } = useUsers(query);
  const canBlock = can('admin:users:block');
  const activeFilters = list.activeCount + (search ? 1 : 0);
  const clear = () => {
    setSearch('');
    list.reset();
  };

  const columns: Column<AdminUser>[] = [
  {
    key: 'name',
    header: 'Name',
    cell: (p) =>
    <div className="flex items-center gap-2.5">
          <Avatar name={fullName(p)} size="sm" />
          <p className="font-medium text-ink">{fullName(p)}</p>
        </div>

  },
  {
    key: 'contact',
    header: 'Contact',
    cell: (p) =>
    <div className="text-[12.5px]">
          <p className="text-ink-2">{p.email}</p>
          <p className="num text-ink-3">{p.phone}</p>
        </div>

  },
  { key: 'status', header: 'Account', cell: (p) => <StatusBadge status={p.isActive ? 'active' : 'suspended'} label={p.isActive ? 'Active' : 'Blocked'} /> },
  { key: 'verified', header: 'Verified', cell: (p) => <span className="text-ink-2">{p.isVerified ? 'Yes' : 'No'}</span> },
  { key: 'login', header: 'Last sign-in', cell: (p) => <span className="text-ink-3">{p.lastLoginAt ? formatRelative(p.lastLoginAt) : 'Never'}</span> },
  { key: 'joined', header: 'Joined', cell: (p) => <span className="num text-ink-3">{formatDate(p.createdAt)}</span> },
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    cell: (p) =>
    <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
        ariaLabel={`Actions for ${fullName(p)}`}
        triggerClassName="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
        trigger={<EllipsisIcon className="h-4 w-4" />}
        items={[
        ...(can('admin:bookings:read') ? [{ label: 'View bookings', icon: CalendarCheckIcon, onSelect: () => navigate(`/bookings?patientId=${p.id}`) }] : []),
        ...(canBlock ? [{ label: p.isActive ? 'Block account' : 'Unblock account', icon: BanIcon, danger: p.isActive, separatorBefore: true, onSelect: () => setTarget(p) }] : [])]
        } />

        </div>

  }];


  return (
    <>
      <PageHeader title="Patients" description="Families and individuals booking care. Health details stay between the patient and their assigned nurse." />
      <Card flush>
        <FilterBar
          className="pt-4"
          activeCount={activeFilters}
          onClear={clear}
          actions={data ? <span className="num text-[12px] text-ink-3">{data.meta.total.toLocaleString('en-US')} patients</span> : undefined}>

          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              list.setPage(1);
            }}
            placeholder="Search name, email, phone…" />

          <Select label="Account" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'blocked', label: 'Blocked' }]} />
        </FilterBar>
        {isError ?
        <ApiErrorState error={error} what="patients" onRetry={() => refetch()} /> :

        <DataTable
          columns={columns}
          rows={data?.items}
          loading={isLoading}
          skeletonRows={8}
          getRowId={(p) => p.id}
          minWidth={900}
          caption="Patients"
          mobileRow={(p) =>
          <div className="flex items-center gap-3">
                <Avatar name={fullName(p)} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink">{fullName(p)}</p>
                  <p className="truncate text-[12px] text-ink-3">{p.email}</p>
                </div>
                <StatusBadge status={p.isActive ? 'active' : 'suspended'} label={p.isActive ? 'Active' : 'Blocked'} />
              </div>
          }
          empty={
          <EmptyState
            icon={UsersIcon}
            title={activeFilters ? 'No patients match your search' : 'No patients yet'}
            description={activeFilters ? 'Check the spelling or search by phone number.' : 'Patients appear here after they create an account in the mobile app.'}
            action={activeFilters ? <Button size="sm" onClick={clear}>Clear search</Button> : undefined} />

          } />

        }
        {!isError && <Pagination meta={data?.meta} onPage={list.setPage} busy={isFetching} />}
      </Card>

      <ConfirmDialog
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        tone={target?.isActive ? 'danger' : 'primary'}
        requireReason={Boolean(target?.isActive)}
        loading={block.isPending}
        title={target?.isActive ? `Block ${target ? fullName(target) : ''}?` : `Unblock ${target ? fullName(target) : ''}?`}
        description={target?.isActive ? 'They are signed out everywhere and cannot sign in or book until unblocked.' : 'They can sign in and book again.'}
        confirmLabel={target?.isActive ? 'Block account' : 'Unblock account'}
        onConfirm={(reason) => {
          if (!target) return;
          const blocked = target.isActive;
          block.mutate(
            { id: target.id, blocked, reason: reason || undefined },
            {
              onSuccess: () => {
                toast.success(blocked ? 'Account blocked' : 'Account unblocked', { description: 'The change is recorded in the audit log.' });
                setTarget(null);
              },
              onError: (e) => toast.error(describeMutationError(e))
            }
          );
        }} />

    </>);

}

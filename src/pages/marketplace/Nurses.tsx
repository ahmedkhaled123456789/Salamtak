import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StarIcon, UserSearchIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button, buttonClasses } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { FilterBar } from '../../components/ui/FilterBar';
import { Select } from '../../components/ui/Select';
import { SummaryStrip } from '../../components/ui/SummaryStrip';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Pagination } from '../../components/ui/Pagination';
import { NurseDrawer } from '../../components/nurses/NurseDrawer';
import { useDashboardStats, useNurses } from '../../hooks/queries';
import { useListState } from '../../hooks/useListState';
import { useSession } from '../../contexts/SessionContext';
import { nurseName } from '../../utils/people';
import type { NurseProfile, NurseStatus, VerificationStatus } from '../../api/types';

const columns: Column<NurseProfile>[] = [
{
  key: 'name',
  header: 'Nurse',
  cell: (n) =>
  <div className="flex items-center gap-2.5">
        <Avatar name={nurseName(n)} size="sm" />
        <div>
          <p className="font-medium text-ink">{nurseName(n)}</p>
          <p className="text-[12px] text-ink-3">{n.yearsOfExperience}y exp.{n.specializations[0] ? ` · ${n.specializations[0]}` : ''}</p>
        </div>
      </div>

},
{ key: 'verification', header: 'Verification', cell: (n) => <StatusBadge status={n.verificationStatus} /> },
{ key: 'status', header: 'Account', cell: (n) => <StatusBadge status={n.status} /> },
{
  key: 'rating',
  header: 'Rating',
  cell: (n) =>
  n.totalReviews > 0 ?
  <span className="num inline-flex items-center gap-1 font-medium">
          <StarIcon className="h-3 w-3 fill-warning text-warning" aria-hidden />
          {n.averageRating.toFixed(2)}
          <span className="font-normal text-ink-3">({n.totalReviews})</span>
        </span> :

  <span className="text-ink-3">No reviews</span>

},
{ key: 'completed', header: 'Completed', align: 'right', cell: (n) => <span className="num">{n.totalCompletedBookings}</span> },
{
  key: 'bookable',
  header: 'Bookable',
  cell: (n) =>
  <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
        <span className={n.isBookable ? 'h-1.5 w-1.5 rounded-full bg-success' : 'h-1.5 w-1.5 rounded-full bg-ink-3/50'} aria-hidden />
        {n.isBookable ? 'Yes' : 'No'}
      </span>

},
{ key: 'location', header: 'City', cell: (n) => <span className="text-ink-2">{n.city ?? '—'}</span> }];


const verificationOptions: VerificationStatus[] = ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED'];
const statusOptions: NurseStatus[] = ['PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED'];
const label = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, ' ');

export function Nurses() {
  const { can } = useSession();
  const list = useListState({ verification: 'all', status: 'all', bookable: 'all' });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      page: list.page,
      limit: list.limit,
      verificationStatus: list.filters.verification === 'all' ? undefined : (list.filters.verification as VerificationStatus),
      status: list.filters.status === 'all' ? undefined : (list.filters.status as NurseStatus),
      isBookable: list.filters.bookable === 'all' ? undefined : list.filters.bookable === 'yes'
    }),
    [list.page, list.limit, list.filters]
  );
  const { data, isLoading, isError, error, refetch, isFetching } = useNurses(query);
  const stats = useDashboardStats();
  const selected = data?.items.find((n) => n.id === selectedId) ?? null;

  return (
    <>
      <PageHeader
        title="Nurses"
        description="Registered caregivers and nurses supplying the marketplace."
        actions={
        can('admin:nurse-documents:review') ?
        <Link to="/operations/verification" className={buttonClasses('primary', 'md')}>
              Verification queue
            </Link> :
        undefined
        } />


      {can('admin:dashboard') &&
      <SummaryStrip
        className="mb-5"
        loading={stats.isLoading}
        items={[
        { label: 'Total nurses', value: stats.data?.totalNurses ?? '—', hint: 'All registered' },
        { label: 'Verified', value: stats.data?.verifiedNurses ?? '—', tone: 'success' },
        { label: 'Pending verification', value: stats.data?.pendingNurses ?? '—', hint: 'Not yet verified', tone: 'warning' },
        { label: 'Suspended', value: stats.data?.suspendedNurses ?? '—', tone: 'danger' }]
        } />

      }

      <Card flush>
        <FilterBar
          className="pt-4"
          activeCount={list.activeCount}
          onClear={list.reset}
          actions={data ? <span className="num text-[12px] text-ink-3">{data.meta.total.toLocaleString('en-US')} nurses</span> : undefined}>

          <Select label="Verification" value={list.filters.verification} onChange={(v) => list.setFilter('verification', v)} options={[{ value: 'all', label: 'All' }, ...verificationOptions.map((v) => ({ value: v, label: label(v) }))]} />
          <Select label="Account" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={[{ value: 'all', label: 'All' }, ...statusOptions.map((v) => ({ value: v, label: label(v) }))]} />
          <Select label="Bookable" value={list.filters.bookable} onChange={(v) => list.setFilter('bookable', v)} options={[{ value: 'all', label: 'Any' }, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
        </FilterBar>

        {isError ?
        <ApiErrorState error={error} what="nurses" onRetry={() => refetch()} /> :

        <DataTable
          columns={columns}
          rows={data?.items}
          loading={isLoading}
          skeletonRows={8}
          getRowId={(n) => n.id}
          onRowClick={(n) => setSelectedId(n.id)}
          selectedId={selectedId}
          minWidth={900}
          caption="Nurses"
          mobileRow={(n) =>
          <div className="flex items-center gap-3">
                <Avatar name={nurseName(n)} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink">{nurseName(n)}</p>
                  <p className="truncate text-[12px] text-ink-3">{n.city ?? '—'} · {n.yearsOfExperience}y exp.</p>
                </div>
                <StatusBadge status={n.verificationStatus} />
              </div>
          }
          empty={
          <EmptyState
            icon={UserSearchIcon}
            title={list.activeCount ? 'No nurses match these filters' : 'No nurses yet'}
            description={list.activeCount ? 'Try removing a filter.' : 'Nurses appear here after they register in the mobile app.'}
            action={list.activeCount ? <Button size="sm" onClick={list.reset}>Clear filters</Button> : undefined} />

          } />

        }
        {!isError && <Pagination meta={data?.meta} onPage={list.setPage} busy={isFetching} />}
      </Card>

      <NurseDrawer nurse={selected} onClose={() => setSelectedId(null)} />
    </>);

}

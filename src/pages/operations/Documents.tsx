import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileTextIcon } from 'lucide-react';
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
import { useDocuments } from '../../hooks/queries';
import { useListState } from '../../hooks/useListState';
import { formatDate } from '../../utils/date';
import { shortId, titleCase } from '../../utils/people';
import type { DocumentType, NurseDocument, VerificationStatus } from '../../api/types';

const STATUSES: VerificationStatus[] = ['PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED'];
const TYPES: DocumentType[] = ['NURSING_LICENSE', 'IDENTITY_DOCUMENT', 'CERTIFICATE', 'QUALIFICATION', 'INSURANCE', 'OTHER'];

const columns: Column<NurseDocument>[] = [
{ key: 'type', header: 'Document', cell: (d) => <span className="font-medium text-ink">{titleCase(d.type)}</span> },
{ key: 'nurse', header: 'Nurse', cell: (d) => <span className="num font-mono text-[12px] text-ink-2" title={d.nurseId}>{shortId(d.nurseId)}</span> },
{ key: 'number', header: 'Number', cell: (d) => <span className="num font-mono text-[12px] text-ink-2">{d.documentNumber ?? '—'}</span> },
{ key: 'expires', header: 'Expires', cell: (d) => <span className="num text-ink-2">{d.expiresAt ? formatDate(d.expiresAt) : 'No expiry'}</span> },
{ key: 'uploaded', header: 'Uploaded', cell: (d) => <span className="num text-ink-3">{formatDate(d.createdAt)}</span> },
{ key: 'status', header: 'Status', cell: (d) => <StatusBadge status={d.status} /> }];


/** All nurse documents (metadata only — files are opened from the verification workspace, via signed links). */
export function Documents() {
  const navigate = useNavigate();
  const list = useListState({ status: 'all', type: 'all' });
  const query = useMemo(
    () => ({
      page: list.page,
      limit: list.limit,
      status: list.filters.status === 'all' ? undefined : (list.filters.status as VerificationStatus),
      type: list.filters.type === 'all' ? undefined : (list.filters.type as DocumentType)
    }),
    [list.page, list.limit, list.filters]
  );
  const { data, isLoading, isError, error, refetch, isFetching } = useDocuments(query);

  return (
    <>
      <PageHeader title="Documents" description="Credential documents uploaded by nurses, with their review status and expiry. Open a row to review the nurse." />
      <Card flush>
        <FilterBar
          className="pt-4"
          activeCount={list.activeCount}
          onClear={list.reset}
          actions={data ? <span className="num text-[12px] text-ink-3">{data.meta.total.toLocaleString('en-US')} documents</span> : undefined}>

          <Select label="Status" value={list.filters.status} onChange={(v) => list.setFilter('status', v)} options={[{ value: 'all', label: 'All' }, ...STATUSES.map((s) => ({ value: s, label: titleCase(s) }))]} />
          <Select label="Type" value={list.filters.type} onChange={(v) => list.setFilter('type', v)} options={[{ value: 'all', label: 'All' }, ...TYPES.map((t) => ({ value: t, label: titleCase(t) }))]} />
        </FilterBar>
        {isError ?
        <ApiErrorState error={error} what="documents" onRetry={() => refetch()} /> :

        <DataTable
          columns={columns}
          rows={data?.items}
          loading={isLoading}
          getRowId={(d) => d.id}
          onRowClick={(d) => navigate(`/operations/verification?nurse=${d.nurseId}`)}
          minWidth={820}
          caption="Nurse documents"
          mobileRow={(d) =>
          <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-ink">{titleCase(d.type)}</p>
                  <p className="num text-[12px] text-ink-3">{d.expiresAt ? `Expires ${formatDate(d.expiresAt)}` : 'No expiry'}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
          }
          empty={
          <EmptyState
            icon={FileTextIcon}
            title={list.activeCount ? 'No documents match these filters' : 'No documents yet'}
            description={list.activeCount ? 'Try removing a filter.' : 'Documents appear after nurses upload their credentials.'}
            action={list.activeCount ? <Button size="sm" onClick={list.reset}>Clear filters</Button> : undefined} />

          } />

        }
        {!isError && <Pagination meta={data?.meta} onPage={list.setPage} busy={isFetching} />}
      </Card>
    </>);

}

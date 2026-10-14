import { useMemo, useState } from 'react';
import { ScrollTextIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { FilterBar } from '../../components/ui/FilterBar';
import { SearchInput } from '../../components/ui/SearchInput';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Pagination } from '../../components/ui/Pagination';
import { useAuditLogs } from '../../hooks/queries';
import { useDebounced } from '../../hooks/useDebounced';
import { formatDateTime } from '../../utils/date';
import { shortId } from '../../utils/people';
import type { AuditEntry } from '../../api/types';

const columns: Column<AuditEntry>[] = [
{ key: 'at', header: 'When', cell: (e) => <span className="num text-ink-2">{formatDateTime(e.at)}</span> },
{ key: 'action', header: 'Action', cell: (e) => <span className="num font-mono text-[12.5px] font-medium text-ink">{e.action}</span> },
{
  key: 'actor',
  header: 'Actor',
  cell: (e) =>
  <div className="flex items-center gap-2">
        {e.actorRole ? <StatusBadge status="neutral" label={e.actorRole} tone="neutral" dot={false} /> : <span className="text-ink-3">System</span>}
        {e.actorId && <span className="num font-mono text-[11.5px] text-ink-3" title={e.actorId}>{shortId(e.actorId)}</span>}
      </div>

},
{ key: 'entity', header: 'Entity', cell: (e) => <span className="text-ink-2">{e.entity}{e.entityId ? <span className="num ml-1.5 font-mono text-[11.5px] text-ink-3" title={e.entityId}>{shortId(e.entityId)}</span> : null}</span> },
{ key: 'request', header: 'Request', cell: (e) => <span className="num font-mono text-[11.5px] text-ink-3">{e.requestId ? shortId(e.requestId) : '—'}</span> }];


/** Append-only audit trail (GET /admin/audit-logs). Before/after payloads are intentionally not displayed. */
export function AuditLogs() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const dEntity = useDebounced(entity.trim());
  const dAction = useDebounced(action.trim());

  const query = useMemo(() => ({ page, limit: 25, entity: dEntity || undefined, action: dAction || undefined }), [page, dEntity, dAction]);
  const { data, isLoading, isError, error, refetch, isFetching } = useAuditLogs(query);
  const active = (entity ? 1 : 0) + (action ? 1 : 0);
  const clear = () => {
    setEntity('');
    setAction('');
    setPage(1);
  };

  return (
    <>
      <PageHeader title="Audit Logs" description="Every administrative and financial action, with who did it and when. The log is append-only." />
      <Card flush>
        <FilterBar
          className="pt-4"
          activeCount={active}
          onClear={clear}
          actions={data ? <span className="num text-[12px] text-ink-3">{data.meta.total.toLocaleString('en-US')} entries</span> : undefined}>

          <SearchInput value={action} onChange={(v) => {setAction(v);setPage(1);}} placeholder="Exact action, e.g. nurse.suspended" className="sm:w-72" />
          <SearchInput value={entity} onChange={(v) => {setEntity(v);setPage(1);}} placeholder="Exact entity, e.g. NurseProfile" className="sm:w-72" />
        </FilterBar>
        {isError ?
        <ApiErrorState error={error} what="audit logs" onRetry={() => refetch()} /> :

        <DataTable
          columns={columns}
          rows={data?.items}
          loading={isLoading}
          skeletonRows={8}
          getRowId={(e) => e.id}
          minWidth={860}
          caption="Audit log"
          mobileRow={(e) =>
          <div>
                <p className="num font-mono text-[12.5px] font-medium text-ink">{e.action}</p>
                <p className="text-[12px] text-ink-3">{e.entity} · {e.actorRole ?? 'System'} · {formatDateTime(e.at)}</p>
              </div>
          }
          empty={
          <EmptyState
            icon={ScrollTextIcon}
            title={active ? 'No entries match' : 'No audit entries yet'}
            description={active ? 'Filters match the action and entity names exactly.' : 'Actions appear here as soon as someone makes a change.'}
            action={active ? <Button size="sm" onClick={clear}>Clear filters</Button> : undefined} />

          } />

        }
        {!isError && <Pagination meta={data?.meta} onPage={setPage} busy={isFetching} />}
      </Card>
    </>);

}

import { useMemo } from 'react';
import { LayersIcon } from 'lucide-react';
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
import { useServices } from '../../hooks/queries';
import { useUploadServiceImage } from '../../hooks/mutations';
import { ImageUploadButton } from '../../components/ui/ImageUploadButton';
import { resolveBackendUrl } from '../../api/client';
import { useListState } from '../../hooks/useListState';
import { formatMinutes } from '../../utils/date';
import { titleCase } from '../../utils/people';
import type { ServiceItem } from '../../api/types';

const CATEGORIES = ['NURSING', 'ELDERLY_CARE', 'POST_SURGERY', 'CHRONIC_CARE', 'DAILY_ASSISTANCE', 'MEDICATION', 'MONITORING', 'COMPANIONSHIP', 'OTHER'];

const unit = (s: ServiceItem) => (s.billingUnit === 'HOURLY' ? 'Per hour' : 'Per day');

function ServicePicture({ s }: {s: ServiceItem;}) {
  const upload = useUploadServiceImage();
  return (
    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
      {s.imageUrl ?
      <img src={resolveBackendUrl(s.imageUrl)} alt="" loading="lazy" className="h-10 w-14 rounded-md object-cover ring-1 ring-line" /> :
      <span className="flex h-10 w-14 items-center justify-center rounded-md bg-subtle text-[10.5px] text-ink-3">No picture</span>
      }
      <ImageUploadButton
        label={s.imageUrl ? 'Replace' : 'Upload'}
        maxBytes={10 * 1024 * 1024}
        busy={upload.isPending}
        successMessage={`Picture updated for ${s.name}`}
        onFile={(file) => upload.mutateAsync({ serviceId: s.id, file })} />
    </div>);

}

const columns: Column<ServiceItem>[] = [
{ key: 'picture', header: 'Picture', cell: (s) => <ServicePicture s={s} /> },
{ key: 'name', header: 'Service', cell: (s) => <div><p className="font-medium text-ink">{s.name}</p><p className="num font-mono text-[11.5px] text-ink-3">{s.slug}</p></div> },
{ key: 'category', header: 'Category', cell: (s) => <span className="text-ink-2">{titleCase(s.category)}</span> },
{ key: 'unit', header: 'Billed', cell: (s) => <span className="text-ink-2">{unit(s)}</span> },
{ key: 'duration', header: 'Duration', cell: (s) => <span className="num text-ink-2">{formatMinutes(s.minDurationMinutes)} – {formatMinutes(s.maxDurationMinutes)}</span> },
{ key: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.isActive ? 'active' : 'inactive'} label={s.isActive ? 'Active' : 'Inactive'} /> }];


/** Catalogue (GET /admin/services) with picture upload. Pricing, activation and text edits are not wired into this dashboard yet. */
export function Services() {
  const list = useListState({ active: 'all', category: 'all' });
  const query = useMemo(
    () => ({
      page: list.page,
      limit: list.limit,
      isActive: list.filters.active === 'all' ? undefined : list.filters.active === 'yes',
      category: list.filters.category === 'all' ? undefined : list.filters.category
    }),
    [list.page, list.limit, list.filters]
  );
  const { data, isLoading, isError, error, refetch, isFetching } = useServices(query);

  return (
    <>
      <PageHeader title="Services" description="The care services patients can book, with how they are billed and the picture shown on the website and app. Prices are managed through the API and aren't shown here." />
      <Card flush>
        <FilterBar className="pt-4" activeCount={list.activeCount} onClear={list.reset} actions={data ? <span className="num text-[12px] text-ink-3">{data.meta.total.toLocaleString('en-US')} services</span> : undefined}>
          <Select label="Status" value={list.filters.active} onChange={(v) => list.setFilter('active', v)} options={[{ value: 'all', label: 'All' }, { value: 'yes', label: 'Active' }, { value: 'no', label: 'Inactive' }]} />
          <Select label="Category" value={list.filters.category} onChange={(v) => list.setFilter('category', v)} options={[{ value: 'all', label: 'All' }, ...CATEGORIES.map((c) => ({ value: c, label: titleCase(c) }))]} />
        </FilterBar>
        {isError ?
        <ApiErrorState error={error} what="services" onRetry={() => refetch()} /> :

        <DataTable
          columns={columns}
          rows={data?.items}
          loading={isLoading}
          getRowId={(s) => s.id}
          minWidth={920}
          caption="Services"
          mobileRow={(s) =>
          <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink">{s.name}</p>
                  <p className="text-[12px] text-ink-3">{unit(s)}</p>
                </div>
                <StatusBadge status={s.isActive ? 'active' : 'inactive'} label={s.isActive ? 'Active' : 'Inactive'} />
              </div>
          }
          empty={
          <EmptyState
            icon={LayersIcon}
            title={list.activeCount ? 'No services match' : 'No services yet'}
            description={list.activeCount ? 'Try removing a filter.' : 'Services are created through the API.'}
            action={list.activeCount ? <Button size="sm" onClick={list.reset}>Clear filters</Button> : undefined} />

          } />

        }
        {!isError && <Pagination meta={data?.meta} onPage={list.setPage} busy={isFetching} />}
      </Card>
    </>);

}

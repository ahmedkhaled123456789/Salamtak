import { Button } from './Button';
import type { PageMeta } from '../../api/types';

interface PaginationProps {
  meta?: PageMeta;
  onPage: (page: number) => void;
  /** True while a page is being (re)fetched; navigation is disabled so requests can't pile up. */
  busy?: boolean;
}

/** Server-side pagination footer: the numbers come straight from the backend's `meta`. */
export function Pagination({ meta, onPage, busy = false }: PaginationProps) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  return (
    <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[12px] text-ink-3">
      <span className="num" aria-live="polite">
        Showing {from.toLocaleString('en-US')}–{to.toLocaleString('en-US')} of {meta.total.toLocaleString('en-US')}
      </span>
      <div className="flex items-center gap-1.5">
        <span className="num mr-1">
          Page {meta.page} of {Math.max(meta.totalPages, 1)}
        </span>
        <Button size="sm" disabled={busy || meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          Previous
        </Button>
        <Button size="sm" disabled={busy || meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

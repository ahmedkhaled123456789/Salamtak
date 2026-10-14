import { useCallback, useRef, useState } from 'react';

/**
 * Filter + page state for a server-paginated table. Changing any filter returns to page 1, so a narrower
 * result set can never leave the table on a page that no longer exists.
 */
export function useListState<F extends Record<string, string>>(initial: F, limit = 20, start?: Partial<F>) {
  const initialRef = useRef(initial);
  const [filters, setFilters] = useState<F>({ ...initial, ...start });
  const [page, setPage] = useState(1);

  const setFilter = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }, []);

  const reset = useCallback(() => {
    setFilters(initialRef.current);
    setPage(1);
  }, []);

  const activeCount = (Object.keys(initialRef.current) as (keyof F)[]).filter((k) => filters[k] !== initialRef.current[k]).length;

  return { filters, setFilter, page, setPage, reset, activeCount, limit };
}

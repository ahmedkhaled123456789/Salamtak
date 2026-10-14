import React from 'react';
import { ErrorState } from '../ui/ErrorState';
import { Skeleton } from '../ui/Skeleton';

/** Shown inside the shell while a page's code loads: same rhythm as a page (header, KPI row, table). */
export function PageFallback() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) =>
        <Skeleton key={i} className="h-24 rounded-xl" />
        )}
      </div>
      <div className="space-y-2 rounded-xl border border-line bg-surface p-5">
        {[0, 1, 2, 3, 4, 5].map((i) =>
        <Skeleton key={i} className="h-9 w-full" />
        )}
      </div>
    </div>);

}

interface BoundaryState {
  error: Error | null;
}

/**
 * Keeps one broken page from blanking the whole dashboard. Also covers a page chunk that can no longer be
 * downloaded (e.g. after a deploy replaced it): reloading fetches the current build.
 */
export class PageErrorBoundary extends React.Component<{children: React.ReactNode;resetKey: string;}, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidUpdate(prev: {resetKey: string;}) {
    // navigating to another page clears the error
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  componentDidCatch(error: Error) {
    console.error('Dashboard page error', error.name);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const chunk = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(this.state.error.message);
    return (
      <ErrorState
        title={chunk ? 'A new version of the dashboard is available' : 'This page failed to load'}
        description={chunk ? 'Reload to get the latest version. Nothing you saved is lost.' : 'Reload the page. If it keeps happening, tell the platform team which page you were on.'}
        onRetry={() => window.location.reload()} />);

  }
}

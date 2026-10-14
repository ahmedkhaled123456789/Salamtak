import type { ReactNode } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { LockIcon } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { buttonClasses } from '../ui/Button';
import { useSessionState } from '../../contexts/SessionContext';

/** Gate for everything behind sign-in. Restores the session first, so a reload doesn't flash the login page. */
export function RequireAuth() {
  const { status } = useSessionState();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas" aria-busy="true" aria-label="Restoring your session">
        <div className="w-64 space-y-3">
          <Skeleton className="mx-auto h-8 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>);

  }
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return <Outlet />;
}

export function AccessDenied() {
  return (
    <Card>
      <EmptyState
        icon={LockIcon}
        title="You don't have access to this page"
        description="Your role doesn't include this area. If you think this is a mistake, ask an administrator."
        action={<Link to="/" className={buttonClasses('secondary', 'sm')}>Back to dashboard</Link>} />

    </Card>);

}

/** UI-level route guard. The API still enforces the same rule on every request. */
export function RequirePermission({ permission, children }: {permission: string;children: ReactNode;}) {
  const { can } = useSessionState();
  return can(permission) ? <>{children}</> : <AccessDenied />;
}

import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LogOutIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { DetailList } from '../../components/ui/DetailList';
import { Skeleton } from '../../components/ui/Skeleton';
import { Avatar } from '../../components/ui/Avatar';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { useSession } from '../../contexts/SessionContext';
import { useSettings } from '../../hooks/queries';
import { visibleSections } from '../../config/navigation';
import { titleCase } from '../../utils/people';

type Tab = 'account' | 'platform';

function display(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function PlatformSettings() {
  const { data, isLoading, isError, error, refetch } = useSettings();
  const groups = useMemo(() => {
    const out = new Map<string, [string, unknown][]>();
    for (const [key, value] of Object.entries(data ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
      const group = key.split('.')[0];
      out.set(group, [...(out.get(group) ?? []), [key, value]]);
    }
    return [...out.entries()];
  }, [data]);

  if (isError) return <Card><ApiErrorState error={error} what="platform settings" onRetry={() => refetch()} /></Card>;
  if (isLoading) return <Card><div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div></Card>;

  return (
    <div className="space-y-5">
      <p className="rounded-md bg-subtle/70 px-3 py-2.5 text-[12.5px] text-ink-3">
        Effective values (defaults merged with stored overrides). These are read-only here — changing a setting is not wired into this dashboard yet.
      </p>
      {groups.map(([group, entries]) =>
      <Card key={group} title={titleCase(group)}>
          <DetailList items={entries.map(([key, value]) => ({ label: key, value: <span className="num break-all font-mono text-[12px]">{display(value)}</span> }))} />
        </Card>
      )}
    </div>);

}

export function Settings() {
  const [params, setParams] = useSearchParams();
  const { user, can, logout } = useSession();
  const canPlatform = can('settings:manage');
  const requested = params.get('tab');
  const tab: Tab = requested === 'platform' && canPlatform ? 'platform' : 'account';
  const pages = visibleSections(can).flatMap((s) => s.items.map((i) => i.label));

  return (
    <>
      <PageHeader title="Settings" description="Your account and, for administrators, the platform configuration." />
      {canPlatform &&
      <SegmentedControl
        className="mb-5"
        ariaLabel="Settings section"
        value={tab}
        onChange={(v) => setParams(v === 'account' ? {} : { tab: v })}
        options={[{ value: 'account', label: 'Account' }, { value: 'platform', label: 'Platform' }]} />

      }

      {tab === 'platform' ? <PlatformSettings /> :
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card title="Your account">
            <div className="mb-4 flex items-center gap-3">
              <Avatar name={user.name} size="lg" />
              <div>
                <p className="text-[15px] font-semibold text-ink">{user.name}</p>
                <p className="text-[12.5px] text-ink-3">{user.email}</p>
              </div>
            </div>
            <DetailList items={[{ label: 'Role', value: user.roleLabel }, { label: 'Account ID', value: user.id, mono: true }]} />
            <Button className="mt-4" icon={<LogOutIcon className="h-3.5 w-3.5" />} onClick={() => void logout()}>Sign out</Button>
          </Card>
          <Card title="What your role can open" description="Access is enforced by the server on every request; this list only mirrors it.">
            <ul className="flex flex-wrap gap-1.5">
              {pages.map((p) => <li key={p} className="rounded-md border border-line bg-subtle/60 px-2 py-1 text-[12px] text-ink-2">{p}</li>)}
            </ul>
          </Card>
        </div>
      }
    </>);

}

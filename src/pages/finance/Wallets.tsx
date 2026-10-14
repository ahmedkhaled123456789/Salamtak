import { useState } from 'react';
import { InfoIcon, SlidersHorizontalIcon, WalletIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { MoneyValue } from '../../components/ui/MoneyValue';
import { Avatar } from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { normalizeError } from '../../api/errors';
import { Skeleton } from '../../components/ui/Skeleton';
import { Pagination } from '../../components/ui/Pagination';
import { WalletAdjustmentModal } from '../../components/finance/WalletAdjustmentModal';
import { useNurses, useWallet } from '../../hooks/queries';
import { useSession } from '../../contexts/SessionContext';
import { nurseName } from '../../utils/people';
import { cn } from '../../utils/cn';
import type { NurseProfile } from '../../api/types';

export function Wallets() {
  const { can } = useSession();
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<NurseProfile | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const nurses = useNurses({ page, limit: 15 });
  const wallet = useWallet(picked?.id ?? null);
  const canNurseList = can('admin:nurses:read');

  return (
    <>
      <PageHeader title="Wallets" description="Nurse earnings balances, read straight from the ledger. Balances change only through the server." />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 shadow-card">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info"><InfoIcon className="h-4 w-4" aria-hidden /></span>
        <div className="text-[13px]">
          <p className="font-medium text-ink">Balances are looked up one nurse at a time</p>
          <p className="mt-0.5 text-ink-3">
            The backend doesn't yet offer a platform-wide wallet list, a ledger-transaction history, or revenue and commission totals, so those views aren't shown rather than being estimated here.
          </p>
        </div>
      </div>

      {!canNurseList ?
      <Card><EmptyState icon={WalletIcon} title="Nurse list unavailable for your role" description="Wallet balances are opened from a nurse record, and your role can't list nurses." /></Card> :

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
          <Card flush title="Nurses" description="Pick a nurse to see their wallet">
            {nurses.isError ?
          <ApiErrorState compact error={nurses.error} what="nurses" onRetry={() => nurses.refetch()} /> :
          nurses.isLoading ?
          <div className="space-y-2 p-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> :

          <ul className="border-t border-line p-1.5">
                {nurses.data?.items.map((n) =>
            <li key={n.id}>
                    <button
                type="button"
                onClick={() => setPicked(n)}
                aria-current={picked?.id === n.id}
                className={cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors', picked?.id === n.id ? 'bg-subtle' : 'hover:bg-subtle/60')}>

                      <Avatar name={nurseName(n)} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{nurseName(n)}</span>
                      <StatusBadge status={n.verificationStatus} dot={false} />
                    </button>
                  </li>
            )}
              </ul>
          }
            <Pagination meta={nurses.data?.meta} onPage={setPage} busy={nurses.isFetching} />
          </Card>

          <div className="min-w-0 space-y-5">
            {!picked ?
          <Card><EmptyState compact icon={WalletIcon} title="Select a nurse" description="Choose a nurse on the left to see their wallet balances." /></Card> :

          <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={nurseName(picked)} size="md" />
                    <div>
                      <p className="text-[15px] font-semibold text-ink">{nurseName(picked)}</p>
                      <p className="num font-mono text-[11.5px] text-ink-3">{picked.id}</p>
                    </div>
                  </div>
                  {can('admin:finance:manage') && wallet.data &&
              <Button icon={<SlidersHorizontalIcon className="h-3.5 w-3.5" />} onClick={() => setAdjusting(true)}>Request adjustment</Button>
              }
                </div>

                {wallet.isError && normalizeError(wallet.error).status === 404 ?
            <Card><EmptyState compact icon={WalletIcon} title="No wallet yet" description="A wallet is created when the nurse earns their first payment, so there is no balance to show." /></Card> :
            wallet.isError ?
            <Card><ApiErrorState error={wallet.error} what="this wallet" onRetry={() => wallet.refetch()} /></Card> :

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Available" loading={wallet.isLoading} value={wallet.data && <MoneyValue fils={wallet.data.availableBalanceMinor} decimals className="text-[22px]" />} hint="Can be withdrawn" />
                    <StatCard label="On hold" loading={wallet.isLoading} value={wallet.data && <MoneyValue fils={wallet.data.pendingBalanceMinor} decimals className="text-[22px]" />} hint="Released after the hold period" />
                    <StatCard label="Lifetime earned" loading={wallet.isLoading} value={wallet.data && <MoneyValue fils={wallet.data.totalEarnedMinor} decimals className="text-[22px]" />} />
                    <StatCard label="Withdrawn" loading={wallet.isLoading} value={wallet.data && <MoneyValue fils={wallet.data.totalWithdrawnMinor} decimals className="text-[22px]" />} />
                  </div>
            }
              </>
          }
          </div>
        </div>
      }

      <WalletAdjustmentModal
        nurse={adjusting && picked && wallet.data ? { id: picked.id, name: nurseName(picked), availableMinor: wallet.data.availableBalanceMinor } : null}
        onClose={() => setAdjusting(false)} />

    </>);

}

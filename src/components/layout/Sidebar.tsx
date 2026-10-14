import { Link, NavLink } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import { PanelLeftCloseIcon, PanelLeftOpenIcon, XIcon } from 'lucide-react';
import { Logo } from './Logo';
import { visibleSections } from '../../config/navigation';
import type { NavItem } from '../../config/navigation';
import { useSession } from '../../contexts/SessionContext';
import { useNavBadges } from '../../hooks/useNavBadges';
import { useQueueHealth } from '../../hooks/queries';
import { cn } from '../../utils/cn';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const badgeTones: Record<NonNullable<NavItem['badgeTone']>, string> = {
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info'
};

const badgeDots: Record<NonNullable<NavItem['badgeTone']>, string> = {
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info'
};

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const { can } = useSession();
  const badges = useNavBadges();
  const sections = visibleSections(can);
  const renderNav = (compact: boolean, onNavigate?: () => void) =>
  <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 pb-4">
      {sections.map((section, sectionIndex) =>
    <div key={section.label} className={cn(sectionIndex > 0 && 'mt-5')}>
          {compact ?
      sectionIndex > 0 && <div className="mx-2 mb-3 h-px bg-line" aria-hidden /> :

      <p className="mb-1 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">{section.label}</p>
      }
          <ul className="space-y-px">
            {section.items.map((item) =>
        <li key={item.path}>
                <NavLink
            to={item.path}
            end={item.path === '/'}
            onClick={onNavigate}
            title={compact ? item.label : undefined}
            className={({ isActive }) =>
            cn(
              'group relative flex h-8 items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors duration-100',
              compact ? 'justify-center' : 'px-2.5',
              isActive ? 'bg-subtle text-ink' : 'text-ink-2 hover:bg-subtle/70 hover:text-ink'
            )
            }>
            
                  {({ isActive }) =>
            <>
                      {isActive && <span className="absolute -left-3 bottom-1.5 top-1.5 w-[3px] rounded-r-full bg-brand" aria-hidden />}
                      <item.icon
                className={cn('h-[15px] w-[15px] shrink-0', isActive ? 'text-brand' : 'text-ink-3 group-hover:text-ink-2')}
                strokeWidth={1.9}
                aria-hidden />
              
                      {!compact && <span className="truncate">{item.label}</span>}
                      {badges[item.path] !== undefined && badges[item.path] > 0 && item.badgeTone && (
              compact ?
              <span className={cn('absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full', badgeDots[item.badgeTone])} aria-label={`${badges[item.path]} pending`} /> :

              <span className={cn('num ml-auto rounded px-1.5 text-[11px] font-semibold leading-[18px]', badgeTones[item.badgeTone])}>
                            {badges[item.path]}
                          </span>)

              }
                    </>
            }
                </NavLink>
              </li>
        )}
          </ul>
        </div>
    )}
    </nav>;


  const renderFooter = (compact: boolean) =>
  can('admin:queues:read') ? <QueueStatusLink compact={compact} /> : null;


  return (
    <>
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out lg:flex',
          collapsed ? 'w-[64px]' : 'w-[248px]'
        )}>
        
        <div className={cn('flex h-14 shrink-0 items-center', collapsed ? 'justify-center' : 'justify-between px-4')}>
          <Link to="/" aria-label="CareFlow dashboard">
            <Logo compact={collapsed} />
          </Link>
          {!collapsed &&
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-subtle hover:text-ink">
            
              <PanelLeftCloseIcon className="h-4 w-4" />
            </button>
          }
        </div>
        {collapsed &&
        <div className="flex justify-center pb-2">
            <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-subtle hover:text-ink">
            
              <PanelLeftOpenIcon className="h-4 w-4" />
            </button>
          </div>
        }
        <div className="pt-2" />
        {renderNav(collapsed)}
        {renderFooter(collapsed)}
      </aside>

      <AnimatePresence>
        {mobileOpen &&
        <div className="fixed inset-0 z-50 lg:hidden">
            <m.div
            className="absolute inset-0 bg-[#0b1322]/30 dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onMobileClose} />
          
            <m.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 34, stiffness: 380 }}
            className="absolute inset-y-0 left-0 flex w-[272px] flex-col border-r border-line bg-surface shadow-pop">
            
              <div className="flex h-14 shrink-0 items-center justify-between px-4">
                <Logo />
                <button type="button" onClick={onMobileClose} aria-label="Close navigation" className="rounded-md p-1.5 text-ink-3 hover:bg-subtle hover:text-ink">
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="pt-2" />
              {renderNav(false, onMobileClose)}
              {renderFooter(false)}
            </m.aside>
          </div>
        }
      </AnimatePresence>
    </>);

}

/** Sidebar footer: the real background-queue state from GET /admin/queues, not a canned "all good". */
function QueueStatusLink({ compact }: {compact: boolean;}) {
  const { data, isError, isLoading } = useQueueHealth(60_000);
  const aliveWorkers = data?.workers.filter((w) => w.alive).length ?? 0;
  const failed = data?.queues.reduce((n, q) => n + q.failed, 0) ?? 0;
  const state = isLoading ? 'checking' : isError || !data || !data.available ? 'unavailable' : failed > 0 ? 'attention' : 'ok';
  const dot = { checking: 'bg-ink-3', unavailable: 'bg-danger', attention: 'bg-warning', ok: 'bg-success' }[state];
  const label = {
    checking: 'Checking queues…',
    unavailable: 'Queue monitor unavailable',
    attention: `${failed} failed job${failed === 1 ? '' : 's'}`,
    ok: 'Queues healthy'
  }[state];
  return (
    <div className={cn('border-t border-line p-3', compact && 'flex flex-col items-center gap-2')}>
      <Link
        to="/operations/queues"
        title={label}
        className={cn('flex items-center gap-2 rounded-md text-[12px] text-ink-2 transition-colors hover:bg-subtle', compact ? 'h-8 w-8 justify-center' : 'px-2.5 py-2')}>
        
        <span className={cn('h-2 w-2 shrink-0 rounded-full', dot)} aria-hidden />
        {!compact &&
        <span className="flex flex-1 items-center justify-between">
            {label}
            {state === 'ok' && <span className="text-[11px] text-ink-3">{aliveWorkers} worker{aliveWorkers === 1 ? '' : 's'}</span>}
          </span>
        }
      </Link>
    </div>);

}

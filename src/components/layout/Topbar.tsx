import { useLocation } from 'react-router-dom';
import { ChevronRightIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon } from 'lucide-react';
import { NotificationsMenu } from './NotificationsMenu';
import { UserMenu } from './UserMenu';
import { findNavItem } from '../../config/navigation';
import { useTheme } from '../../contexts/ThemeContext';

interface TopbarProps {
  onOpenMenu: () => void;
  onOpenSearch: () => void;
  shortcutLabel: string;
}

export function Topbar({ onOpenMenu, onOpenSearch, shortcutLabel }: TopbarProps) {
  const { pathname } = useLocation();
  const { resolved, toggle } = useTheme();
  const match = findNavItem(pathname);
  const title = match?.item.label ?? 'Not found';

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-md md:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation"
        className="-ml-1 rounded-md p-1.5 text-ink-2 hover:bg-subtle hover:text-ink lg:hidden">
        
        <MenuIcon className="h-[18px] w-[18px]" />
      </button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        {match && match.section !== 'Overview' &&
        <>
            <span className="hidden text-ink-3 sm:inline">{match.section}</span>
            <ChevronRightIcon className="hidden h-3.5 w-3.5 text-ink-3/70 sm:block" aria-hidden />
          </>
        }
        <span className="truncate font-semibold text-ink" aria-current="page">
          {title}
        </span>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenSearch}
          className="mr-1 hidden h-8 w-60 items-center gap-2 rounded-md border border-line bg-canvas px-2.5 text-[12.5px] text-ink-3 transition-colors hover:border-line-strong md:flex xl:w-72">
          
          <SearchIcon className="h-3.5 w-3.5" aria-hidden />
          Search anything…
          <kbd className="ml-auto rounded border border-line bg-surface px-1.5 font-sans text-[10.5px] font-medium text-ink-3">{shortcutLabel}</kbd>
        </button>
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 hover:bg-subtle hover:text-ink md:hidden">
          
          <SearchIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggle}
          aria-label={resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-subtle hover:text-ink">
          
          {resolved === 'dark' ? <SunIcon className="h-4 w-4" strokeWidth={1.9} /> : <MoonIcon className="h-4 w-4" strokeWidth={1.9} />}
        </button>
        <NotificationsMenu />
        <div className="mx-1 h-5 w-px bg-line" aria-hidden />
        <UserMenu />
      </div>
    </header>);

}
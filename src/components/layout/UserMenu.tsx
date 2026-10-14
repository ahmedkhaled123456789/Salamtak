import { useNavigate } from 'react-router-dom';
import { ChevronDownIcon, LogOutIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon, UserIcon } from 'lucide-react';
import { Dropdown } from '../ui/Dropdown';
import { Avatar } from '../ui/Avatar';
import { useSession } from '../../contexts/SessionContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemePreference } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';

const themeOptions: {value: ThemePreference;label: string;icon: typeof SunIcon;}[] = [
{ value: 'light', label: 'Light', icon: SunIcon },
{ value: 'dark', label: 'Dark', icon: MoonIcon },
{ value: 'system', label: 'System', icon: MonitorIcon }];


export function UserMenu() {
  const { user, logout } = useSession();
  const { preference, setPreference } = useTheme();
  const navigate = useNavigate();
  const firstName = user.name.split(' ')[0];

  return (
    <Dropdown
      ariaLabel="Open user menu"
      widthClassName="w-64"
      triggerClassName="flex h-8 items-center gap-2 rounded-md pl-1 pr-1.5 transition-colors hover:bg-subtle"
      trigger={
      <>
          <Avatar name={user.name} size="xs" />
          <span className="hidden text-[13px] font-medium text-ink md:inline">{firstName}</span>
          <ChevronDownIcon className="hidden h-3.5 w-3.5 text-ink-3 md:block" aria-hidden />
        </>
      }>
      
      {(close) =>
      <div>
          <div className="flex items-center gap-3 px-2.5 pb-2.5 pt-2">
            <Avatar name={user.name} size="md" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
              <p className="truncate text-[12px] text-ink-3">{user.email}</p>
            </div>
          </div>
          <div className="mx-2.5 mb-2 rounded-md bg-subtle px-2 py-1 text-[11px] font-medium text-ink-2">{user.roleLabel}</div>
          <div className="-mx-1 mb-1 h-px bg-line" />
          {[
        { label: 'Profile', icon: UserIcon, onClick: () => navigate('/settings?tab=account') },
        { label: 'Settings', icon: SettingsIcon, onClick: () => navigate('/settings') }].
        map((item) =>
        <button
          key={item.label}
          type="button"
          role="menuitem"
          onClick={() => {
            item.onClick();
            close();
          }}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-ink hover:bg-subtle">
          
              <item.icon className="h-3.5 w-3.5 text-ink-3" aria-hidden />
              {item.label}
            </button>
        )}
          <div className="px-2.5 py-2">
            <p className="mb-1.5 text-[11.5px] text-ink-3">Theme</p>
            <div className="grid grid-cols-3 gap-1 rounded-md bg-subtle p-0.5" role="radiogroup" aria-label="Theme">
              {themeOptions.map((opt) =>
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={preference === opt.value}
              onClick={() => setPreference(opt.value)}
              className={cn(
                'flex h-7 items-center justify-center gap-1 rounded text-[11.5px] font-medium transition-colors',
                preference === opt.value ? 'bg-surface text-ink shadow-xs ring-1 ring-line' : 'text-ink-3 hover:text-ink-2'
              )}>
              
                  <opt.icon className="h-3 w-3" aria-hidden />
                  {opt.label}
                </button>
            )}
            </div>
          </div>
          <div className="-mx-1 my-1 h-px bg-line" />
          <button
          type="button"
          role="menuitem"
          onClick={() => {
            close();
            void logout();
          }}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-danger hover:bg-danger-soft">
          
            <LogOutIcon className="h-3.5 w-3.5" aria-hidden />
            Log out
          </button>
        </div>
      }
    </Dropdown>);

}
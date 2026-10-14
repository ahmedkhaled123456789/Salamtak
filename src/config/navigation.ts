import type { LucideIcon } from 'lucide-react';
import {
  ActivityIcon,
  BadgeCheckIcon,
  BanknoteIcon,
  BellIcon,
  CalendarCheckIcon,
  CreditCardIcon,
  FileTextIcon,
  InboxIcon,
  LayersIcon,
  LayoutDashboardIcon,
  MessagesSquareIcon,
  ScaleIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SirenIcon,
  StarIcon,
  StethoscopeIcon,
  TicketPercentIcon,
  TrendingUpIcon,
  Undo2Icon,
  UsersIcon,
  WalletIcon } from
'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Backend permission that grants access (UI gating only — the API enforces it). Omitted = any signed-in admin. */
  permission?: string;
  badgeTone?: 'warning' | 'danger' | 'info';
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
{ label: 'Overview', items: [{ label: 'Dashboard', path: '/', icon: LayoutDashboardIcon }] },
{
  label: 'Marketplace',
  items: [
  { label: 'Bookings', path: '/bookings', icon: CalendarCheckIcon, permission: 'admin:bookings:read' },
  { label: 'Nurses', path: '/nurses', icon: StethoscopeIcon, permission: 'admin:nurses:read' },
  { label: 'Patients', path: '/patients', icon: UsersIcon, permission: 'admin:users:read' },
  { label: 'Services', path: '/services', icon: LayersIcon, permission: 'services:manage' },
  { label: 'Emergency Requests', path: '/emergency', icon: SirenIcon, permission: 'admin:emergency:manage', badgeTone: 'danger' }]

},
{
  label: 'Finance',
  items: [
  { label: 'Payments', path: '/finance/payments', icon: CreditCardIcon, permission: 'admin:finance:read' },
  { label: 'Refunds', path: '/finance/refunds', icon: Undo2Icon, permission: 'admin:finance:read' },
  { label: 'Payouts', path: '/finance/payouts', icon: BanknoteIcon, permission: 'admin:finance:read' },
  { label: 'Wallets', path: '/finance/wallets', icon: WalletIcon, permission: 'admin:finance:read' },
  { label: 'Finance Approvals', path: '/finance/approvals', icon: ShieldCheckIcon, permission: 'admin:finance:read', badgeTone: 'info' },
  { label: 'Reconciliation', path: '/finance/reconciliation', icon: ScaleIcon, permission: 'admin:finance:read' }]

},
{
  label: 'Engagement',
  items: [
  { label: 'Reviews', path: '/reviews', icon: StarIcon, permission: 'admin:reviews:moderate' },
  { label: 'Coupons', path: '/coupons', icon: TicketPercentIcon, permission: 'admin:coupons:manage' },
  { label: 'Conversations', path: '/conversations', icon: MessagesSquareIcon, permission: 'chat:use' },
  { label: 'Inbox', path: '/inbox', icon: InboxIcon, permission: 'admin:inbox:manage', badgeTone: 'info' }]

},
{
  label: 'Operations',
  items: [
  { label: 'Nurse Verification', path: '/operations/verification', icon: BadgeCheckIcon, permission: 'admin:nurse-documents:review', badgeTone: 'warning' },
  { label: 'Documents', path: '/operations/documents', icon: FileTextIcon, permission: 'admin:nurse-documents:review' },
  { label: 'Notifications', path: '/operations/notifications', icon: BellIcon, permission: 'notifications:self' },
  { label: 'Reports', path: '/reports', icon: TrendingUpIcon, permission: 'admin:reports:read' },
  { label: 'Queue Health', path: '/operations/queues', icon: ActivityIcon, permission: 'admin:queues:read' }]

},
{
  label: 'System',
  items: [
  { label: 'Settings', path: '/settings', icon: SettingsIcon },
  { label: 'Audit Logs', path: '/audit-logs', icon: ScrollTextIcon, permission: 'admin:audit:read' }]

}];


export function findNavItem(pathname: string): {section: string;item: NavItem;} | null {
  for (const section of navSections) {
    for (const item of section.items) {
      const match = item.path === '/' ? pathname === '/' : pathname === item.path || pathname.startsWith(`${item.path}/`);
      if (match) return { section: section.label, item };
    }
  }
  return null;
}

/** Sections reduced to what the current role may open; empty sections are dropped. */
export function visibleSections(can: (permission: string) => boolean): NavSection[] {
  return navSections.
  map((s) => ({ ...s, items: s.items.filter((i) => !i.permission || can(i.permission)) })).
  filter((s) => s.items.length > 0);
}

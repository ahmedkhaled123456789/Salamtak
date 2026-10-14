/**
 * UI-side mirror of the backend RBAC registry (care-backend/src/common/constants/rbac.ts) for the two roles
 * allowed into this dashboard. It only decides what to SHOW. Every request is authorised again by the API,
 * which is the real security boundary — if these tables ever drift, the backend simply answers 403.
 *
 * FINANCE_APPROVER is deliberately NOT a superset of ADMIN, and ADMIN cannot approve (separation of duties).
 */
export const ADMIN_ROLES = ['ADMIN', 'FINANCE_APPROVER'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  ADMIN: 'Administrator',
  FINANCE_APPROVER: 'Finance Approver',
};

export const ROLE_PERMISSIONS: Record<AdminRole, readonly string[]> = {
  ADMIN: [
    'profile:self',
    'admin:dashboard',
    'admin:users:read',
    'admin:users:block',
    'admin:nurses:read',
    'admin:nurses:verify',
    'admin:nurses:suspend',
    'admin:audit:read',
    'services:read',
    'services:manage',
    'pricing:manage',
    'settings:manage',
    'holidays:manage',
    'bookings:read',
    'admin:bookings:read',
    'admin:bookings:manage',
    'payments:read',
    'admin:finance:read',
    'admin:finance:manage',
    'notifications:self',
    'admin:queues:read',
    'files:self',
    'admin:files:read',
    'admin:nurse-documents:review',
    'admin:reviews:moderate',
    'admin:coupons:manage',
    'admin:emergency:manage',
    'chat:use',
    'admin:reports:read',
    'admin:media:manage',
    'admin:inbox:manage',
  ],
  FINANCE_APPROVER: ['profile:self', 'admin:finance:read', 'admin:finance:approve', 'notifications:self', 'admin:queues:read'],
};

export function isAdminRole(role: string): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

export function roleCan(role: string, permission: string): boolean {
  return isAdminRole(role) && ROLE_PERMISSIONS[role].includes(permission);
}

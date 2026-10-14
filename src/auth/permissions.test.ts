import { describe, expect, it } from 'vitest';
import { isAdminRole, roleCan } from './permissions';

describe('role permissions (UI mirror of the backend RBAC)', () => {
  it('only ADMIN and FINANCE_APPROVER may use the dashboard', () => {
    expect(isAdminRole('ADMIN')).toBe(true);
    expect(isAdminRole('FINANCE_APPROVER')).toBe(true);
    expect(isAdminRole('PATIENT')).toBe(false);
    expect(isAdminRole('NURSE')).toBe(false);
    expect(roleCan('PATIENT', 'admin:finance:read')).toBe(false);
  });

  it('FINANCE_APPROVER has no general administrative access', () => {
    for (const p of ['admin:dashboard', 'admin:users:read', 'admin:bookings:read', 'admin:nurses:read', 'admin:nurse-documents:review', 'admin:reviews:moderate', 'admin:coupons:manage', 'admin:emergency:manage', 'admin:audit:read', 'settings:manage', 'admin:finance:manage']) {
      expect(roleCan('FINANCE_APPROVER', p)).toBe(false);
    }
    expect(roleCan('FINANCE_APPROVER', 'admin:finance:read')).toBe(true);
    expect(roleCan('FINANCE_APPROVER', 'admin:finance:approve')).toBe(true);
  });

  it('ADMIN can request money movements but can never approve them (separation of duties)', () => {
    expect(roleCan('ADMIN', 'admin:finance:manage')).toBe(true);
    expect(roleCan('ADMIN', 'admin:finance:approve')).toBe(false);
  });
});

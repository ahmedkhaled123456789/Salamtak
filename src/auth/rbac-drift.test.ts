import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROLE_PERMISSIONS } from './permissions';
import { navSections } from '../config/navigation';

/**
 * Guards against the UI's permission mirror drifting from the backend's RBAC registry (the real authority).
 * It reads the backend source directly, so it only runs when the monorepo layout is present.
 */
const backendRbac = resolve(__dirname, '../../../care-backend/src/common/constants/rbac.ts');

/** Pull the quoted permission names out of `NAME: [ ... ]` / `NAME = [ ... ]` blocks in the backend source. */
function block(source: string, header: RegExp): string[] {
  const start = source.search(header);
  if (start < 0) throw new Error(`block not found: ${header}`);
  const open = source.indexOf('[', start);
  const close = source.indexOf(']', open);
  return [...source.slice(open, close).matchAll(/'([a-z:-]+)'/g)].map((m) => m[1]);
}

describe.runIf(existsSync(backendRbac))('UI permission mirror vs backend RBAC', () => {
  const source = existsSync(backendRbac) ? readFileSync(backendRbac, 'utf8') : '';

  it('matches the backend permissions for ADMIN and FINANCE_APPROVER', () => {
    for (const role of ['ADMIN', 'FINANCE_APPROVER'] as const) {
      const server = new Set(block(source, new RegExp(`\\b${role}: \\[`)));
      expect(server.size).toBeGreaterThan(3);
      const ui = new Set(ROLE_PERMISSIONS[role]);
      // Every permission the UI believes in must really be granted by the server...
      expect([...ui].filter((p) => !server.has(p))).toEqual([]);
      // ...and the UI may only omit permissions the dashboard has no screen for (self-service / mobile-app ones).
      const omitted = [...server].filter((p) => !ui.has(p));
      expect(omitted.filter((p) => !/:self$|^nurses:search$|^devices:|^bookings:/.test(p))).toEqual([]);
    }
  });

  it('every navigation permission exists in the backend registry', () => {
    const registry = new Set(block(source, /export const PERMISSIONS = \[/));
    const used = navSections.flatMap((s) => s.items.map((i) => i.permission)).filter((p): p is string => Boolean(p));
    expect(registry.size).toBeGreaterThan(10);
    expect(used.filter((p) => !registry.has(p))).toEqual([]);
  });
});

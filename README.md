# Slamtak Admin Dashboard

React 18 + Vite + TypeScript + Tailwind + TanStack Query. The UI/design system comes from Magic Patterns; the data layer
talks to `care-backend` (see `../docs/admin-integration-map.md`). There is no demo/mock data in the app.

```bash
npm install
cp .env.example .env.local
npm run dev        # http://localhost:5173  (proxies /api to VITE_DEV_API_TARGET)
npm run typecheck && npm run lint && npm test && npm run build
```

## Layout

```
src/
  api/            ONE axios client (client.ts: bearer, single-flight refresh, error normalising), token store,
                  wire types (types.ts), normalizers for lean Mongo documents, and one module per domain
                  (auth, dashboard, bookings, users, nurses, verification, finance, reviews, coupons, emergency, ops)
  auth/           UI mirror of the backend RBAC (display gating only)
  contexts/       SessionContext (login / logout / restore), ThemeContext
  hooks/          queries.ts (all reads), mutations.ts (all writes, in-flight lock, invalidate-after-confirm)
  components/ui/  design system (unchanged) + Pagination, ApiErrorState, Unavailable
  pages/          one folder per area; every page handles loading / empty / error / forbidden
```

## Rules the code follows

* Tokens: access token in memory, refresh token in `sessionStorage`; never `localStorage`; never logged or rendered.
* Money is integer fils from the API and is only formatted here; the browser never calculates balances or fees.
* Where the backend has no data (revenue series, wallet ledger, exports …) the screen says so; nothing is simulated.

## Loading, errors and indexing (audit 2026-10-11)

* Every page except Login is its own chunk (`App.tsx`, `React.lazy`); while a page's code loads, the shell stays and
  `PageFallback` shows a page-shaped skeleton. Animation features load after first paint (`LazyMotion`, `lib/motionFeatures.ts`).
  Entry bundle: 816 kB → 435 kB (241 → 139 kB gzipped).
* `PageErrorBoundary` keeps a crashing page — or a page chunk that no longer exists after a deploy — from blanking the app,
  and offers a reload.
* The dashboard is `noindex, nofollow` (`index.html`) and `public/robots.txt` disallows everything.
* Verified with `npm run typecheck` ✅, `npm run lint` ✅ (0 errors, 10 pre-existing warnings), `npm test` ✅ 30 passed / 25 skipped
  (opt-in live tests), `npm run build` ✅. The live/e2e suites were not re-run (they need seeded admin accounts on a disposable stack).

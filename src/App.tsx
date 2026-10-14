import { lazy, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { SessionProvider } from './contexts/SessionContext';
import { AppShell } from './components/layout/AppShell';
import { AppToaster } from './components/layout/AppToaster';
import { RequireAuth, RequirePermission } from './components/auth/guards';
import { createQueryClient } from './lib/queryClient';
import { Login } from './pages/Login';

/** Each page is its own chunk: sign-in and the first screen don't download every page (and recharts). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lazyPage = <T extends Record<string, React.ComponentType<any>>,>(loader: () => Promise<T>, key: keyof T) =>
lazy(() => loader().then((m) => ({ default: m[key] })));

const Dashboard = lazyPage(() => import('./pages/Dashboard'), 'Dashboard');
const Bookings = lazyPage(() => import('./pages/marketplace/Bookings'), 'Bookings');
const Nurses = lazyPage(() => import('./pages/marketplace/Nurses'), 'Nurses');
const Patients = lazyPage(() => import('./pages/marketplace/Patients'), 'Patients');
const EmergencyRequests = lazyPage(() => import('./pages/marketplace/EmergencyRequests'), 'EmergencyRequests');
const Payments = lazyPage(() => import('./pages/finance/Payments'), 'Payments');
const Refunds = lazyPage(() => import('./pages/finance/Refunds'), 'Refunds');
const Payouts = lazyPage(() => import('./pages/finance/Payouts'), 'Payouts');
const Wallets = lazyPage(() => import('./pages/finance/Wallets'), 'Wallets');
const FinanceApprovals = lazyPage(() => import('./pages/finance/FinanceApprovals'), 'FinanceApprovals');
const Reconciliation = lazyPage(() => import('./pages/finance/Reconciliation'), 'Reconciliation');
const Reviews = lazyPage(() => import('./pages/engagement/Reviews'), 'Reviews');
const Coupons = lazyPage(() => import('./pages/engagement/Coupons'), 'Coupons');
const Inbox = lazyPage(() => import('./pages/engagement/Inbox'), 'Inbox');
const NurseVerification = lazyPage(() => import('./pages/operations/NurseVerification'), 'NurseVerification');
const Documents = lazyPage(() => import('./pages/operations/Documents'), 'Documents');
const Reports = lazyPage(() => import('./pages/operations/Reports'), 'Reports');
const QueueHealth = lazyPage(() => import('./pages/operations/QueueHealth'), 'QueueHealth');
const Settings = lazyPage(() => import('./pages/system/Settings'), 'Settings');
const Services = lazyPage(() => import('./pages/system/Services'), 'Services');
const Conversations = lazyPage(() => import('./pages/system/Conversations'), 'Conversations');
const Notifications = lazyPage(() => import('./pages/system/Notifications'), 'Notifications');
const AuditLogs = lazyPage(() => import('./pages/system/AuditLogs'), 'AuditLogs');
const NotFound = lazyPage(() => import('./pages/system/NotFound'), 'NotFound');

/** A route whose page needs a specific backend permission (UI gate only; the API enforces it too). */
const guard = (permission: string, page: React.ReactNode) => <RequirePermission permission={permission}>{page}</RequirePermission>;

/** Animation features load after first paint, outside the entry bundle; until then elements render unanimated. */
const loadMotionFeatures = () => import('./lib/motionFeatures').then((m) => m.default);

export function App() {
  const [queryClient] = useState(createQueryClient);

  return (
    <LazyMotion features={loadMotionFeatures} strict>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SessionProvider>
          <BrowserRouter>
            <Routes>
              <Route path="login" element={<Login />} />
              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="bookings" element={guard('admin:bookings:read', <Bookings />)} />
                  <Route path="nurses" element={guard('admin:nurses:read', <Nurses />)} />
                  <Route path="patients" element={guard('admin:users:read', <Patients />)} />
                  <Route path="services" element={guard('services:manage', <Services />)} />
                  <Route path="emergency" element={guard('admin:emergency:manage', <EmergencyRequests />)} />
                  <Route path="finance/payments" element={guard('admin:finance:read', <Payments />)} />
                  <Route path="finance/refunds" element={guard('admin:finance:read', <Refunds />)} />
                  <Route path="finance/payouts" element={guard('admin:finance:read', <Payouts />)} />
                  <Route path="finance/wallets" element={guard('admin:finance:read', <Wallets />)} />
                  <Route path="finance/approvals" element={guard('admin:finance:read', <FinanceApprovals />)} />
                  <Route path="finance/reconciliation" element={guard('admin:finance:read', <Reconciliation />)} />
                  <Route path="reviews" element={guard('admin:reviews:moderate', <Reviews />)} />
                  <Route path="coupons" element={guard('admin:coupons:manage', <Coupons />)} />
                  <Route path="conversations" element={guard('chat:use', <Conversations />)} />
                  <Route path="inbox" element={guard('admin:inbox:manage', <Inbox />)} />
                  <Route path="operations/verification" element={guard('admin:nurse-documents:review', <NurseVerification />)} />
                  <Route path="operations/documents" element={guard('admin:nurse-documents:review', <Documents />)} />
                  <Route path="operations/notifications" element={guard('notifications:self', <Notifications />)} />
                  <Route path="reports" element={guard('admin:reports:read', <Reports />)} />
                  <Route path="operations/queues" element={guard('admin:queues:read', <QueueHealth />)} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="audit-logs" element={guard('admin:audit:read', <AuditLogs />)} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
          <AppToaster />
        </SessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </LazyMotion>);

}

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { CalendarCheckIcon, FlaskConicalIcon, HeartHandshakeIcon, LockIcon, ShieldCheckIcon, TriangleAlertIcon } from 'lucide-react';
import { Logo } from '../components/layout/Logo';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { normalizeError } from '../api/errors';
import { useSessionState } from '../contexts/SessionContext';
import loginImage from '../assets/login-care.jpg';

const HIGHLIGHTS = [
  { icon: HeartHandshakeIcon, text: 'Vetted caregivers matched to every family' },
  { icon: CalendarCheckIcon, text: 'Visits, schedules and payouts in one place' },
  { icon: ShieldCheckIcon, text: 'Every action verified and audit-logged' },
] as const;

/** Portfolio deployment backed by a DEMO_MODE API: list the public demo accounts (their password is public too). */
const PORTFOLIO_DEMO = import.meta.env.VITE_PORTFOLIO_DEMO === 'true';
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? '';
const DEMO_ACCOUNTS = [
  { label: 'Administrator', email: 'admin@careflow-demo.test' },
  { label: 'Finance approver', email: 'finance@careflow-demo.test' },
] as const;

function loginErrorMessage(error: unknown): string {
  const e = normalizeError(error);
  if (e.status === 401) return 'Incorrect email or password.';
  if (e.status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
  return e.message;
}

export function Login() {
  const { status, login } = useSessionState();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to={from} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(loginErrorMessage(err));
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      {/* Brand panel: photo with a teal wash. A short banner on mobile, the left half on large screens. */}
      <aside className="relative isolate flex h-56 shrink-0 flex-col justify-between overflow-hidden p-6 pb-16 text-white sm:h-72 sm:pb-20 lg:h-auto lg:w-[52%] lg:p-12 xl:w-[56%]">
        <img
          src={loginImage}
          alt=""
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          decoding="async" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0B3F3B]/90 via-[#0F5F58]/75 to-[#14857B]/45" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-[#06201E]/85 to-transparent" aria-hidden />

        <Logo tone="light" />

        <div className="max-w-lg">
          <p lang="ar" dir="rtl" className="hidden text-[15px] font-medium text-white/80 lg:block" style={{ fontFamily: "'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif" }}>
            رعاية تصل إلى باب البيت
          </p>
          <h2 className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.02em] sm:text-[26px] lg:text-[36px]">
            Care that comes home.
          </h2>
          <p className="mt-3 hidden max-w-md text-[14px] leading-relaxed text-white/75 lg:block">
            Manage caregivers, visits and payouts for every family you serve — in one secure workspace.
          </p>
          <ul className="mt-8 hidden gap-3 lg:grid">
            {HIGHLIGHTS.map(({ icon: Icon, text }) =>
            <li key={text} className="flex items-center gap-3 text-[13.5px] text-white/90">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/20 backdrop-blur">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {text}
              </li>
            )}
          </ul>
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-1 items-start justify-center px-4 pb-10 sm:px-8 lg:items-center lg:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(rgb(var(--line-strong))_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
          aria-hidden />
        <div className="relative -mt-10 w-full max-w-[400px] sm:-mt-14 lg:mt-0">
        <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-pop sm:p-8">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Welcome back</h1>
            <p className="mt-1 text-[13px] text-ink-3">Sign in with your administrator or finance approver account.</p>
          </div>

          {error &&
          <div role="alert" className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger-soft px-3 py-2.5 text-[12.5px] text-ink-2">
              <TriangleAlertIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
              <span>{error}</span>
            </div>
          }

          <TextField
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)} />

          <TextField
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)} />


          <Button type="submit" variant="primary" className="h-10 w-full" loading={submitting} disabled={!email.trim() || !password}>
            Sign in
          </Button>

          {PORTFOLIO_DEMO &&
          <div className="rounded-md border border-line bg-canvas px-3 py-2.5 text-[12.5px] text-ink-2">
              <p className="flex items-center gap-1.5 font-semibold text-ink">
                <FlaskConicalIcon className="h-3.5 w-3.5" aria-hidden />
                Portfolio demo — fictional data, simulated payments
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEMO_ACCOUNTS.map((a) =>
              <button
                key={a.email}
                type="button"
                className="rounded-md border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-ink hover:bg-canvas"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(DEMO_PASSWORD);
                  setError(null);
                }}>
                    {a.label}
                  </button>
              )}
              </div>
            </div>
          }

          <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-ink-3">
            <LockIcon className="h-3 w-3" aria-hidden />
            Every action is checked again by the server and recorded in the audit log.
          </p>
        </form>
        <p className="mt-6 text-center text-[11.5px] text-ink-3">© {new Date().getFullYear()} Salamtak · Home Care Platform</p>
        </div>
      </main>
    </div>);

}

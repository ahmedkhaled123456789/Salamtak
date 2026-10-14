import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { FlaskConicalIcon, LockIcon, TriangleAlertIcon } from 'lucide-react';
import { Logo } from '../components/layout/Logo';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { normalizeError } from '../api/errors';
import { useSessionState } from '../contexts/SessionContext';

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
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-xl border border-line bg-surface p-6 shadow-card">
          <div>
            <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">Sign in</h1>
            <p className="mt-0.5 text-[13px] text-ink-3">Administrator and finance approver accounts only.</p>
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


          <Button type="submit" variant="primary" className="w-full" loading={submitting} disabled={!email.trim() || !password}>
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
      </div>
    </div>);

}

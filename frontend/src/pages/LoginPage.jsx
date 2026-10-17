import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import Logo from '../components/Logo.jsx';

export default function LoginPage() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect once the session exists (covers both a fresh login and
  // arriving here while already signed in).
  useEffect(() => {
    if (!user) return;
    const fallback = user.role === 'admin' ? '/admin' : '/dashboard';
    navigate(location.state?.from || fallback, { replace: true });
  }, [user, navigate, location.state]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const loggedIn = await login(form);
      toast.success(`Welcome back, ${loggedIn.name.split(' ')[0]}!`);
    } catch (apiError) {
      setError(apiError);
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fieldErrors = error?.fieldErrors || {};

  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="w-full max-w-md">
        <div className="flex justify-center lg:hidden">
          <Logo />
        </div>

        <div className="mt-8 card-padded sm:mt-10">
          <div className="text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
              <ShieldCheck className="h-5 w-5 text-brand-600" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Sign in to report a problem or manage complaints.
            </p>
          </div>

          {error && (
            <Alert
              className="mt-6"
              variant="error"
              title={error.status === 401 ? 'Sign-in failed' : 'Could not sign you in'}
              message={error.message}
              errors={Array.isArray(error.details) ? error.details : undefined}
            />
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="input pl-10"
                  aria-invalid={Boolean(fieldErrors.email)}
                />
              </div>
              {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <KeyRound
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input pl-10"
                  aria-invalid={Boolean(fieldErrors.password)}
                />
              </div>
              {fieldErrors.password && <p className="field-error">{fieldErrors.password}</p>}
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            New to CivicFix AI?{' '}
            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Create a citizen account
            </Link>
          </p>
        </div>

        {/* Demo credentials helper - remove this block before a real deployment */}
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-white/70 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Demo helper
          </p>
          <div className="mt-2.5 space-y-1.5 text-xs text-slate-600">
            <p>
              <span className="font-semibold text-slate-700">Citizen:</span> register below - any email and
              a password of 8+ characters.
            </p>
            <p>
              <span className="font-semibold text-slate-700">Administrator:</span>{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">admin@civicfix.ai</code> /{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">Admin@12345</code>
            </p>
            <p className="text-slate-400">
              The admin account is created by <code className="font-mono">npm run seed</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

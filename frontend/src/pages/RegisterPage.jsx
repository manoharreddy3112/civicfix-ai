import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Mail, UserPlus, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import Logo from '../components/Logo.jsx';

const initialForm = { name: '', email: '', password: '', confirmPassword: '' };

export default function RegisterPage() {
  const { user, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
  }, [user, navigate]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError({ message: 'The two passwords do not match.', status: 400, fieldErrors: { confirmPassword: 'Passwords do not match' } });
      return;
    }

    setSubmitting(true);
    try {
      const created = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      toast.success(`Welcome to CivicFix AI, ${created.name.split(' ')[0]}!`, {
        title: 'Account created',
      });
      navigate('/dashboard', { replace: true });
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
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50">
              <UserPlus className="h-5 w-5 text-accent-600" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Create your account</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Free citizen account - report and track public problems.
            </p>
          </div>

          {error && (
            <Alert
              className="mt-6"
              variant="error"
              title="Could not create your account"
              message={error.message}
              errors={Array.isArray(error.details) ? error.details : undefined}
            />
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="name" className="label">
                Full name
              </label>
              <div className="relative">
                <UserRound
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={80}
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Asha Rao"
                  className="input pl-10"
                  aria-invalid={Boolean(fieldErrors.name)}
                />
              </div>
              {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}
            </div>

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
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
                  className="input pl-10"
                  aria-invalid={Boolean(fieldErrors.password)}
                />
              </div>
              {fieldErrors.password ? (
                <p className="field-error">{fieldErrors.password}</p>
              ) : (
                <p className="field-hint">Minimum 8 characters. Stored only as a bcrypt hash.</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm password
              </label>
              <div className="relative">
                <KeyRound
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  className="input pl-10"
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                />
              </div>
              {fieldErrors.confirmPassword && <p className="field-error">{fieldErrors.confirmPassword}</p>}
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? (
                <>
                  <Spinner size="sm" className="text-white" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

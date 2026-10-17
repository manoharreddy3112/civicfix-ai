import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:px-6">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
        <Compass className="h-8 w-8 text-brand-600" aria-hidden="true" />
      </span>

      <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-brand-600">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Page not found</h1>
      <p className="mt-3 text-slate-600">
        The page you are looking for does not exist, or the link you followed is out of date.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to="/" className="btn-primary">
          <Home className="h-4 w-4" aria-hidden="true" />
          Back to home
        </Link>
        <Link to="/dashboard" className="btn-secondary">
          Go to my dashboard
        </Link>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Megaphone } from 'lucide-react';

/** CivicFix AI wordmark. */
export default function Logo({ to = '/', compact = false, className = '' }) {
  return (
    <Link to={to} className={`group inline-flex items-center gap-2.5 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-500 shadow-sm transition group-hover:shadow-chat">
        <Megaphone className="h-5 w-5 text-white" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block text-base font-bold tracking-tight text-slate-900">
            CivicFix<span className="text-brand-600"> AI</span>
          </span>
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Smart Complaints
          </span>
        </span>
      )}
    </Link>
  );
}

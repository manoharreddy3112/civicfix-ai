import { Loader2 } from 'lucide-react';

/** Inline spinner with an optional label. */
export default function Spinner({ size = 'md', label, className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-8 w-8' };

  return (
    <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
      {/* `className` colours the icon so it stays visible on coloured buttons. */}
      <Loader2 className={`animate-spin ${sizes[size]} ${className || 'text-brand-600'}`} aria-hidden="true" />
      {label && <span className="text-sm text-slate-600">{label}</span>}
      <span className="sr-only">{label || 'Loading'}</span>
    </span>
  );
}

/** Full-viewport loader used while the session is being restored. */
export function FullPageLoader({ label = 'Loading CivicFix AI...' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 shadow-chat">
        <Loader2 className="h-6 w-6 animate-spin text-white" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

/** Skeleton block for list loading states. */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card-padded animate-pulse space-y-3">
      <div className="h-4 w-1/3 rounded bg-slate-200" />
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="h-3 rounded bg-slate-100" style={{ width: `${90 - index * 12}%` }} />
      ))}
    </div>
  );
}

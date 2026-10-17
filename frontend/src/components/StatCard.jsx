import { cn } from '../lib/format.js';

/**
 * Dashboard summary tile.
 * When `onClick` is provided it becomes a toggle button used as a filter.
 */
export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  hint,
  onClick,
  active = false,
  loading = false,
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    accent: 'bg-accent-50 text-accent-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      {...(onClick
        ? {
            type: 'button',
            onClick,
            'aria-pressed': active,
          }
        : {})}
      className={cn(
        'card-padded group w-full text-left transition',
        onClick && 'hover:shadow-card-hover focus-visible:ring-2 focus-visible:ring-brand-500',
        active && 'ring-2 ring-brand-500'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-14 animate-pulse rounded bg-slate-200" />
          ) : (
            <p className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          )}
          {hint && <p className="mt-1 truncate text-xs text-slate-400">{hint}</p>}
        </div>

        {Icon && (
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
      </div>
    </Wrapper>
  );
}

import { CheckCircle2, Circle } from 'lucide-react';
import { statusStyle } from '../lib/constants.js';
import { formatDateTime } from '../lib/format.js';

/**
 * Vertical audit trail of every status change, showing who changed it and when.
 */
export default function StatusTimeline({ history = [] }) {
  if (!history.length) {
    return <p className="muted">No status history recorded yet.</p>;
  }

  // Newest first reads better on a details page.
  const entries = [...history].sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-6">
      {entries.map((entry, index) => {
        const style = statusStyle(entry.status);
        const isLatest = index === 0;
        const Icon = isLatest ? CheckCircle2 : Circle;

        return (
          <li key={`${entry.status}-${entry.changedAt}-${index}`} className="relative">
            <span
              className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-white ring-1 ring-slate-200`}
            >
              <Icon className={`h-4 w-4 ${isLatest ? 'text-brand-600' : 'text-slate-300'}`} aria-hidden="true" />
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${style.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
                {entry.status}
              </span>
              {isLatest && (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Latest
                </span>
              )}
            </div>

            <p className="mt-1.5 text-xs text-slate-500">
              {formatDateTime(entry.changedAt)} &middot;{' '}
              <span className="font-medium text-slate-600">{entry.changedByName || 'System'}</span>
              {entry.changedByRole && entry.changedByRole !== 'system' && (
                <span className="text-slate-400"> ({entry.changedByRole})</span>
              )}
            </p>

            {entry.note && (
              <p className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {entry.note}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

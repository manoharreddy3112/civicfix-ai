import { statusStyle } from '../lib/constants.js';

/** Coloured pill for "Submitted" / "In Progress" / "Resolved". */
export default function StatusBadge({ status, size = 'md' }) {
  const style = statusStyle(status);
  const sizing = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`badge ${style.badge} ${sizing}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {status}
    </span>
  );
}

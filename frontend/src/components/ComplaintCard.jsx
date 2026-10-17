import { Link } from 'react-router-dom';
import { ChevronRight, Clock, MapPin } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import CategoryBadge from './CategoryBadge.jsx';
import { formatDate, timeAgo } from '../lib/format.js';

/**
 * Complaint summary row used on the citizen dashboard and in the admin list.
 * `href` decides where the card links (citizen detail vs admin detail).
 */
export default function ComplaintCard({ complaint, href, showCitizen = false }) {
  const destination = href || `/complaints/${complaint.trackingId}`;

  return (
    <Link
      to={destination}
      className="card-interactive block p-4 focus-visible:ring-2 focus-visible:ring-brand-500 sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono-id">{complaint.trackingId}</span>
            <StatusBadge status={complaint.status} size="sm" />
            <CategoryBadge category={complaint.category} size="sm" />
          </div>

          <p className="mt-2.5 line-clamp-2 text-sm text-slate-700">{complaint.description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="line-clamp-1">{complaint.location}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {timeAgo(complaint.createdAt) || formatDate(complaint.createdAt)}
            </span>
            {showCitizen && complaint.citizen && (
              <span className="inline-flex items-center gap-1.5">
                <span className="font-medium text-slate-600">{complaint.citizen.name}</span>
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300" aria-hidden="true" />
      </div>
    </Link>
  );
}

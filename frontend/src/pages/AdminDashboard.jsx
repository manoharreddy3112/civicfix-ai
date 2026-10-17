import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Inbox,
  Layers,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import api from '../lib/api.js';
import { CATEGORIES, STATUSES } from '../lib/constants.js';
import { useToast } from '../context/ToastContext.jsx';
import Alert from '../components/Alert.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import CategoryIcon from '../components/CategoryIcon.jsx';
import StatusTimeline from '../components/StatusTimeline.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Spinner, { SkeletonCard } from '../components/Spinner.jsx';
import { formatDateTime, timeAgo } from '../lib/format.js';

/* ---------------------------------------------------------------------------
 * Details dialog
 * ------------------------------------------------------------------------- */

function ComplaintDialog({ complaint, onClose, onUpdated }) {
  const toast = useToast();
  const closeRef = useRef(null);

  const [status, setStatus] = useState(complaint.status);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Escape closes; focus moves into the dialog for keyboard users.
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.adminUpdateStatus(complaint.trackingId, { status, note });
      toast.success(`${complaint.trackingId} is now "${response.data.complaint.status}".`);
      onUpdated(response.data.complaint);
    } catch (apiError) {
      toast.error(apiError.message);
    } finally {
      setSaving(false);
    }
  };

  const unchanged = status === complaint.status && !note.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complaint-dialog-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-3xl animate-fade-in-up overflow-y-auto rounded-t-2xl bg-white shadow-chat sm:rounded-2xl">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50">
              <CategoryIcon category={complaint.category} className="h-5 w-5 text-brand-600" />
            </span>
            <div className="min-w-0">
              <h2 id="complaint-dialog-title" className="font-mono text-base font-bold text-slate-900">
                {complaint.trackingId}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={complaint.status} size="sm" />
                <CategoryBadge category={complaint.category} size="sm" />
              </div>
            </div>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-6 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          {/* Left: details */}
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{complaint.description}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Location</p>
              <p className="mt-1 text-sm text-slate-700">{complaint.location}</p>
            </div>

            <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Citizen</p>
                <p className="mt-1 text-sm text-slate-700">{complaint.citizen?.name || 'Unknown'}</p>
                <p className="text-xs text-slate-400">{complaint.citizen?.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submitted</p>
                <p className="mt-1 text-sm text-slate-700">{formatDateTime(complaint.createdAt)}</p>
              </div>
            </div>

            {/* Status update */}
            <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Update status</p>

              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor="dialog-status" className="label">
                    Status
                  </label>
                  <select
                    id="dialog-status"
                    className="select"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    {STATUSES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="dialog-note" className="label">
                    Note <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="dialog-note"
                    rows={3}
                    maxLength={500}
                    className="input resize-y"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Visible to the citizen in the status history."
                  />
                  <p className="field-hint">{note.length}/500 characters</p>
                </div>

                <button type="submit" disabled={saving || unchanged} className="btn-primary w-full">
                  {saving ? (
                    <>
                      <Spinner size="sm" className="text-white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      Save status update
                    </>
                  )}
                </button>

                {unchanged && (
                  <p className="text-xs text-slate-500">
                    Choose a different status or add a note to record an update.
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Right: history */}
          <aside>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status history</p>
            <div className="mt-4">
              <StatusTimeline history={complaint.statusHistory} />
            </div>
          </aside>
        </div>

        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
          <Link
            to={`/admin/complaints/${complaint.trackingId}`}
            className="btn-secondary btn-sm"
            onClick={onClose}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Open full page
          </Link>
          <button type="button" onClick={onClose} className="btn-ghost btn-sm">
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

export default function AdminDashboard() {
  const toast = useToast();

  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [meta, setMeta] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [rawQuery, setRawQuery] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  /* --- Debounce search -------------------------------------------------- */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(rawQuery.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [rawQuery]);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await api.adminStats();
      setStats(response.data);
    } catch (apiError) {
      setError(apiError);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadComplaints = useCallback(async () => {
    setLoadingList(true);
    try {
      const response = await api.adminComplaints({
        status: statusFilter,
        category: categoryFilter,
        sort,
        q: query,
        page,
        limit: 10,
      });
      setComplaints(response.data.complaints);
      setMeta(response.data.meta);
    } catch (apiError) {
      setError(apiError);
      setComplaints([]);
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter, categoryFilter, sort, query, page]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const refresh = () => {
    setError(null);
    loadStats();
    loadComplaints();
  };

  const counts = stats?.counts || { total: 0, submitted: 0, inProgress: 0, resolved: 0 };
  const hasFilters = Boolean(statusFilter || categoryFilter || query);

  const clearFilters = () => {
    setStatusFilter('');
    setCategoryFilter('');
    setRawQuery('');
    setQuery('');
    setPage(1);
  };

  const handleUpdated = (updated) => {
    setSelected(updated);
    setComplaints((current) =>
      current.map((item) => (item.trackingId === updated.trackingId ? updated : item))
    );
    loadStats();
  };

  const applyStatusFilter = (value) => {
    setStatusFilter((current) => (current === value ? '' : value));
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Administrator dashboard</h1>
          <p className="muted mt-1">
            Triage every complaint across the city and keep the status history accurate.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={refresh} className="btn-secondary btn-sm">
            <RefreshCw className={`h-3.5 w-3.5 ${loadingStats || loadingList ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && <Alert className="mt-5" variant="error" title="Request failed" message={error.message} />}

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total complaints"
          value={counts.total}
          icon={Layers}
          tone="slate"
          loading={loadingStats}
          onClick={() => applyStatusFilter('')}
          active={statusFilter === ''}
        />
        <StatCard
          label="Submitted"
          value={counts.submitted}
          icon={Clock}
          tone="amber"
          hint="Awaiting assignment"
          loading={loadingStats}
          onClick={() => applyStatusFilter('Submitted')}
          active={statusFilter === 'Submitted'}
        />
        <StatCard
          label="In progress"
          value={counts.inProgress}
          icon={AlertCircle}
          tone="brand"
          loading={loadingStats}
          onClick={() => applyStatusFilter('In Progress')}
          active={statusFilter === 'In Progress'}
        />
        <StatCard
          label="Resolved"
          value={counts.resolved}
          icon={CheckCircle2}
          tone="accent"
          loading={loadingStats}
          onClick={() => applyStatusFilter('Resolved')}
          active={statusFilter === 'Resolved'}
        />
      </div>

      {/* Filters */}
      <div className="mt-8 card-padded">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 section-title">
            <SlidersHorizontal className="h-4 w-4 text-brand-600" aria-hidden="true" />
            Filter complaints
          </h2>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="btn-ghost btn-sm">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear all
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="admin-search" className="label">
              Search
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="admin-search"
                type="search"
                className="input pl-10"
                value={rawQuery}
                onChange={(event) => setRawQuery(event.target.value)}
                placeholder="Tracking ID, description or location"
              />
            </div>
          </div>

          <div>
            <label htmlFor="admin-status" className="label">
              Status
            </label>
            <select
              id="admin-status"
              className="select"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="admin-category" className="label">
              Category
            </label>
            <select
              id="admin-category"
              className="select"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Sort:</span>
          {[
            ['newest', 'Newest first'],
            ['oldest', 'Oldest first'],
            ['updated', 'Recently updated'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setSort(value);
                setPage(1);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                sort === value
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">
            Complaints
            {meta ? <span className="ml-2 text-sm font-normal text-slate-400">({meta.total})</span> : null}
          </h2>
          {meta && meta.pages > 1 && (
            <p className="text-xs text-slate-500">
              Page {meta.page} of {meta.pages}
            </p>
          )}
        </div>

        {loadingList ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : complaints.length === 0 ? (
          <div className="card mt-4">
            <EmptyState
              icon={Inbox}
              title={hasFilters ? 'No complaints match these filters' : 'No complaints yet'}
              description={
                hasFilters
                  ? 'Try widening the search or clearing the filters.'
                  : 'As soon as citizens start reporting problems they will appear here.'
              }
              action={
                hasFilters ? (
                  <button type="button" onClick={clearFilters} className="btn-secondary">
                    Clear filters
                  </button>
                ) : null
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card lg:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {['Tracking ID', 'Category', 'Location', 'Citizen', 'Status', 'Updated', ''].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {complaints.map((complaint) => (
                    <tr key={complaint._id} className="transition hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="mono-id">{complaint.trackingId}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <CategoryBadge category={complaint.category} size="sm" />
                      </td>
                      <td className="max-w-[14rem] px-4 py-3">
                        <p className="truncate text-sm text-slate-600">{complaint.location}</p>
                      </td>
                      <td className="max-w-[12rem] px-4 py-3">
                        <p className="truncate text-sm text-slate-700">{complaint.citizen?.name || '-'}</p>
                        <p className="truncate text-xs text-slate-400">{complaint.citizen?.email}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={complaint.status} size="sm" />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {timeAgo(complaint.lastStatusAt || complaint.updatedAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelected(complaint)}
                          className="btn-secondary btn-sm"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="mt-4 space-y-3 lg:hidden">
              {complaints.map((complaint) => (
                <button
                  key={complaint._id}
                  type="button"
                  onClick={() => setSelected(complaint)}
                  className="card-interactive w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="mono-id">{complaint.trackingId}</span>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{complaint.description}</p>
                      <p className="mt-1.5 truncate text-xs text-slate-400">{complaint.location}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {complaint.citizen?.name} &middot; {timeAgo(complaint.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <StatusBadge status={complaint.status} size="sm" />
                      <CategoryBadge category={complaint.category} size="sm" showIcon={false} />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {meta && meta.pages > 1 && (
              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!meta.hasPrevPage}
                  className="btn-secondary btn-sm"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Previous
                </button>

                <span className="text-xs text-slate-500">
                  Page {meta.page} of {meta.pages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!meta.hasNextPage}
                  className="btn-secondary btn-sm"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <ComplaintDialog complaint={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />
      )}
    </div>
  );
}

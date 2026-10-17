import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  Layers,
  MessageSquarePlus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import api from '../lib/api.js';
import { STATUSES, statusStyle } from '../lib/constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';
import StatCard from '../components/StatCard.jsx';
import ComplaintCard from '../components/ComplaintCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { SkeletonCard } from '../components/Spinner.jsx';

const TRACKING_PATTERN = /^CIV-\d{4}-[A-Z0-9]{6}$/i;

export default function CitizenDashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [meta, setMeta] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [rawQuery, setRawQuery] = useState('');
  const [query, setQuery] = useState('');

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [error, setError] = useState(null);

  /* --- Debounce the search box ------------------------------------------ */
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(rawQuery.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [rawQuery]);

  /* --- Stats ------------------------------------------------------------ */
  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await api.myStats();
      setStats(response.data);
    } catch (apiError) {
      setError(apiError);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  /* --- Complaint list --------------------------------------------------- */
  const loadComplaints = useCallback(async () => {
    setLoadingList(true);
    try {
      const response = await api.myComplaints({ status: statusFilter, q: query, limit: 50 });
      setComplaints(response.data.complaints);
      setMeta(response.data.meta);
    } catch (apiError) {
      setError(apiError);
      setComplaints([]);
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter, query]);

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
  const firstName = user?.name?.split(' ')[0] || 'there';

  const hasFilters = Boolean(statusFilter || query);
  const clearFilters = () => {
    setStatusFilter('');
    setRawQuery('');
    setQuery('');
  };

  const directTrackId = useMemo(
    () => (TRACKING_PATTERN.test(rawQuery.trim()) ? rawQuery.trim().toUpperCase() : null),
    [rawQuery]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Hello, {firstName}</h1>
          <p className="muted mt-1">
            Track your civic complaints and see exactly where each one stands.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={refresh} className="btn-secondary btn-sm" aria-label="Refresh data">
            <RefreshCw className={`h-3.5 w-3.5 ${loadingStats || loadingList ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link to="/chat" className="btn-primary">
            <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
            Report a new problem
          </Link>
        </div>
      </div>

      {error && <Alert className="mt-5" variant="error" title="Something went wrong" message={error.message} />}

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total complaints"
          value={counts.total}
          icon={Layers}
          tone="slate"
          loading={loadingStats}
          onClick={() => setStatusFilter('')}
          active={statusFilter === ''}
        />
        <StatCard
          label="Submitted"
          value={counts.submitted}
          icon={Clock}
          tone="amber"
          hint="Awaiting assignment"
          loading={loadingStats}
          onClick={() => setStatusFilter('Submitted')}
          active={statusFilter === 'Submitted'}
        />
        <StatCard
          label="In progress"
          value={counts.inProgress}
          icon={AlertCircle}
          tone="brand"
          hint="Crew working on it"
          loading={loadingStats}
          onClick={() => setStatusFilter('In Progress')}
          active={statusFilter === 'In Progress'}
        />
        <StatCard
          label="Resolved"
          value={counts.resolved}
          icon={CheckCircle2}
          tone="accent"
          hint="Completed"
          loading={loadingStats}
          onClick={() => setStatusFilter('Resolved')}
          active={statusFilter === 'Resolved'}
        />
      </div>

      {/* Search + filters */}
      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <label htmlFor="tracking-search" className="sr-only">
            Search by tracking ID
          </label>
          <input
            id="tracking-search"
            type="search"
            value={rawQuery}
            onChange={(event) => setRawQuery(event.target.value)}
            placeholder="Search by tracking ID, e.g. CIV-2026-A7K3P9"
            className="input pl-10 pr-10"
          />
          {rawQuery && (
            <button
              type="button"
              onClick={() => setRawQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('')}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              statusFilter === ''
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          {STATUSES.map((status) => {
            const style = statusStyle(status);
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(isActive ? '' : status)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? `${style.solid} text-white`
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-white' : style.dot}`}
                  aria-hidden="true"
                />
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Direct tracking shortcut */}
      {directTrackId && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="text-sm text-brand-800">
            That looks like a full tracking ID:{' '}
            <span className="font-mono font-semibold">{directTrackId}</span>
          </p>
          <Link to={`/complaints/${directTrackId}`} className="btn-primary btn-sm">
            Track it now
          </Link>
        </div>
      )}

      {/* List */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">
            {query || statusFilter ? 'Matching complaints' : 'Recent complaints'}
            {meta ? <span className="ml-2 text-sm font-normal text-slate-400">({meta.total})</span> : null}
          </h2>

          {hasFilters && (
            <button type="button" onClick={clearFilters} className="btn-ghost btn-sm">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>

        {loadingList ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : complaints.length === 0 ? (
          <div className="card mt-4">
            <EmptyState
              icon={Inbox}
              title={hasFilters ? 'No complaints match your filters' : 'You have not reported anything yet'}
              description={
                hasFilters
                  ? 'Try a different tracking ID, or clear the filters to see everything.'
                  : 'Start a conversation with CivicFix AI and file your first complaint in under a minute.'
              }
              action={
                hasFilters ? (
                  <button type="button" onClick={clearFilters} className="btn-secondary">
                    Clear filters
                  </button>
                ) : (
                  <Link to="/chat" className="btn-primary">
                    <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                    Report a problem
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {complaints.map((complaint) => (
              <ComplaintCard key={complaint._id} complaint={complaint} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

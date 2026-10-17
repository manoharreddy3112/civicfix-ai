import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  History,
  MapPin,
  Search,
  Send,
  User,
} from 'lucide-react';
import api from '../lib/api.js';
import { STATUSES } from '../lib/constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Alert from '../components/Alert.jsx';
import Spinner, { FullPageLoader } from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import CategoryIcon from '../components/CategoryIcon.jsx';
import StatusTimeline from '../components/StatusTimeline.jsx';
import { formatDateTime } from '../lib/format.js';

export default function ComplaintDetailPage() {
  const { trackingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const toast = useToast();

  // /admin/complaints/:id is the administrator view of the same page.
  const isAdminView = isAdmin && location.pathname.startsWith('/admin');

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Administrator status update form
  const [newStatus, setNewStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = isAdminView ? await api.adminComplaint(trackingId) : await api.complaint(trackingId);
      setComplaint(response.data.complaint);
      setNewStatus(response.data.complaint.status);
    } catch (apiError) {
      setError(apiError);
    } finally {
      setLoading(false);
    }
  }, [trackingId, isAdminView]);

  useEffect(() => {
    load();
  }, [load]);

  const copyTrackingId = async () => {
    try {
      await navigator.clipboard.writeText(complaint.trackingId);
      setCopied(true);
      toast.success('Tracking ID copied to the clipboard.');
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Your browser blocked clipboard access.');
    }
  };

  const handleStatusUpdate = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await api.adminUpdateStatus(complaint.trackingId, { status: newStatus, note });
      setComplaint(response.data.complaint);
      setNote('');
      toast.success(response.message || `Status updated to "${response.data.complaint.status}".`);
    } catch (apiError) {
      setError(apiError);
      toast.error(apiError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <FullPageLoader label="Loading complaint..." />;

  if (error && !complaint) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Alert variant="error" title="Complaint not available" message={error.message} />

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={isAdminView ? '/admin' : '/dashboard'} className="btn-secondary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to {isAdminView ? 'admin panel' : 'dashboard'}
          </Link>
          <Link to="/chat" className="btn-primary">
            <Search className="h-4 w-4" aria-hidden="true" />
            Ask the chatbot
          </Link>
        </div>

        {error.status === 404 && (
          <p className="mt-4 text-sm text-slate-500">
            Tip: for privacy, citizens can only open complaints filed from their own account.
          </p>
        )}
      </div>
    );
  }

  if (!complaint) return null;

  const submittedAt = complaint.statusHistory?.[0]?.changedAt || complaint.createdAt;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate(isAdminView ? '/admin' : '/dashboard')}
        className="btn-ghost btn-sm -ml-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to {isAdminView ? 'all complaints' : 'my dashboard'}
      </button>

      {error && (
        <Alert className="mt-4" variant="error" message={error.message} />
      )}

      {/* Header */}
      <div className="mt-4 card-padded">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tracking ID</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {complaint.trackingId}
              </h1>
              <button
                type="button"
                onClick={copyTrackingId}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Copy tracking ID"
              >
                {copied ? <Check className="h-4 w-4 text-accent-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={complaint.status} />
              <CategoryBadge category={complaint.category} />
            </div>
          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50">
            <CategoryIcon category={complaint.category} className="h-7 w-7 text-brand-600" />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Details */}
        <div className="space-y-5">
          <section className="card-padded">
            <h2 className="section-title">Complaint details</h2>

            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</dt>
                <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {complaint.description}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Location</dt>
                <dd className="mt-1 flex items-start gap-2 text-sm text-slate-700">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  {complaint.location}
                </dd>
              </div>

              <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Submitted</dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                    <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    {formatDateTime(submittedAt)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last update</dt>
                  <dd className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                    <Clock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    {formatDateTime(complaint.lastStatusAt || complaint.updatedAt)}
                  </dd>
                </div>

                {complaint.citizen && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reported by</dt>
                    <dd className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                      <User className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      {complaint.citizen.name}
                      {complaint.citizen.email && (
                        <span className="text-slate-400">({complaint.citizen.email})</span>
                      )}
                    </dd>
                  </div>
                )}
              </div>
            </dl>
          </section>

          {/* Admin action */}
          {isAdminView && (
            <section className="card-padded">
              <h2 className="section-title">Update status</h2>
              <p className="muted mt-1">
                Every change is recorded against your account with a timestamp.
              </p>

              {complaint.status === 'Resolved' && complaint.resolvedAt && (
                <Alert
                  className="mt-4"
                  variant="success"
                  message={`Resolved on ${formatDateTime(complaint.resolvedAt)}.`}
                />
              )}

              <form onSubmit={handleStatusUpdate} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="new-status" className="label">
                    New status
                  </label>
                  <select
                    id="new-status"
                    className="select"
                    value={newStatus}
                    onChange={(event) => setNewStatus(event.target.value)}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="status-note" className="label">
                    Note for the citizen <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    id="status-note"
                    rows={3}
                    maxLength={500}
                    className="input resize-y"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="e.g. Repair crew scheduled for Friday morning."
                  />
                  <p className="field-hint">{note.length}/500 characters</p>
                </div>

                <button
                  type="submit"
                  disabled={saving || (complaint.status === newStatus && !note.trim())}
                  className="btn-primary w-full"
                >
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

                {complaint.status === newStatus && !note.trim() && (
                  <p className="text-xs text-slate-500">
                    Pick a different status, or add a note to record an update.
                  </p>
                )}
              </form>
            </section>
          )}
        </div>

        {/* History */}
        <aside>
          <section className="card-padded">
            <h2 className="flex items-center gap-2 section-title">
              <History className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Status history
            </h2>
            <p className="muted mt-1">
              {complaint.statusHistory?.length || 0} recorded{' '}
              {complaint.statusHistory?.length === 1 ? 'entry' : 'entries'}
            </p>

            <div className="mt-5">
              <StatusTimeline history={complaint.statusHistory} />
            </div>

            {complaint.status === 'Resolved' && (
              <div className="mt-5 flex items-start gap-2 rounded-lg border border-accent-200 bg-accent-50 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden="true" />
                <p className="text-sm text-accent-800">
                  This complaint has been resolved. Thank you for helping improve the city.
                </p>
              </div>
            )}
          </section>

          {!isAdminView && (
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                Something not right?
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Ask the assistant about this tracking ID and it will read the latest status straight from the
                database.
              </p>
              <Link to="/chat" className="btn-secondary btn-sm mt-3">
                Open the chatbot
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Info,
  MapPin,
  MessageSquare,
  RefreshCw,
  Send,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import api from '../lib/api.js';
import { CATEGORIES } from '../lib/constants.js';
import { useToast } from '../context/ToastContext.jsx';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import CategoryBadge from '../components/CategoryBadge.jsx';
import StatusTimeline from '../components/StatusTimeline.jsx';
import { formatDateTime } from '../lib/format.js';

const uid = () => Math.random().toString(36).slice(2, 10);
const EMPTY_DRAFT = { category: null, description: null, location: null };

const SUGGESTIONS = [
  "There's a large pothole on MG Road near the bus stop",
  'Garbage has been piling up behind the vegetable market',
  'A streetlight outside our building has been broken for a week',
  'Water is leaking from a pipeline near the school gate',
];

const DRAFT_FIELDS = [
  { key: 'category', label: 'Category', icon: Tag },
  { key: 'description', label: 'Description', icon: ClipboardList },
  { key: 'location', label: 'Location', icon: MapPin },
];

/* ---------------------------------------------------------------------------
 * Chat bubbles
 * ------------------------------------------------------------------------- */

function UserBubble({ text }) {
  return (
    <div className="flex animate-fade-in-up justify-end">
      <p className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white shadow-sm sm:max-w-[75%]">
        {text}
      </p>
    </div>
  );
}

function AssistantBubble({ text, isError = false }) {
  return (
    <div className="flex animate-fade-in-up gap-2.5">
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isError ? 'bg-red-50' : 'bg-gradient-to-br from-brand-600 to-accent-500'
        }`}
      >
        {isError ? (
          <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden="true" />
        ) : (
          <Bot className="h-4 w-4 text-white" aria-hidden="true" />
        )}
      </span>
      <p
        className={`max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-md border px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%] ${
          isError ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-700'
        }`}
      >
        {text}
      </p>
    </div>
  );
}

/** The tracking result the chatbot pulled from MongoDB. */
function StatusResultCard({ complaint }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex animate-fade-in-up gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50">
        <ClipboardList className="h-4 w-4 text-accent-600" aria-hidden="true" />
      </span>

      <div className="w-full max-w-[85%] rounded-2xl rounded-bl-md border border-accent-200 bg-accent-50/60 p-4 sm:max-w-[75%]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono-id">{complaint.trackingId}</span>
          <StatusBadge status={complaint.status} size="sm" />
        </div>

        <p className="mt-2 text-sm font-medium text-slate-800">{complaint.category}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {complaint.location}
        </p>

        {expanded && (
          <div className="mt-4 border-t border-accent-200 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-700">Status history</p>
            <div className="mt-3">
              <StatusTimeline history={complaint.statusHistory} />
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setExpanded((value) => !value)} className="btn-ghost btn-sm">
            {expanded ? 'Hide history' : 'Show history'}
          </button>
          <Link to={`/complaints/${complaint.trackingId}`} className="btn-secondary btn-sm">
            Open full details
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Confirmation card shown once the complaint has really been created. */
function CreatedCard({ complaint }) {
  return (
    <div className="flex animate-fade-in-up gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-100">
        <CheckCircle2 className="h-4 w-4 text-accent-700" aria-hidden="true" />
      </span>

      <div className="w-full max-w-[85%] rounded-2xl rounded-bl-md border border-accent-300 bg-white p-4 shadow-card sm:max-w-[75%]">
        <p className="text-sm font-semibold text-accent-700">Complaint submitted</p>
        <p className="mt-1 text-sm text-slate-600">
          Save this tracking ID - you can use it any time to check the status.
        </p>

        <p className="mt-3 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-3 py-2.5 text-center font-mono text-lg font-bold tracking-wider text-brand-700">
          {complaint.trackingId}
        </p>

        <dl className="mt-3 space-y-1 text-xs text-slate-500">
          <div className="flex gap-2">
            <dt className="w-20 shrink-0">Category</dt>
            <dd className="font-medium text-slate-700">{complaint.category}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0">Location</dt>
            <dd className="font-medium text-slate-700">{complaint.location}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0">Submitted</dt>
            <dd className="font-medium text-slate-700">{formatDateTime(complaint.createdAt)}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link to={`/complaints/${complaint.trackingId}`} className="btn-primary btn-sm">
            Track this complaint
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <Link to="/dashboard" className="btn-secondary btn-sm">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

export default function ChatbotPage() {
  const toast = useToast();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [missingFields, setMissingFields] = useState([]);

  const [mode, setMode] = useState(null);
  const [booting, setBooting] = useState(true);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(EMPTY_DRAFT);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);

  /* --- Boot: greeting + AI mode ----------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [greeting, modeResponse] = await Promise.all([api.chatGreeting(), api.chatMode()]);
        if (cancelled) return;

        setMode(modeResponse.data);
        setMessages([
          { id: uid(), role: 'assistant', text: greeting.data.reply, aiMode: greeting.data.aiMode },
        ]);
      } catch (apiError) {
        if (!cancelled) setError(apiError);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* --- Auto-scroll ------------------------------------------------------ */
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages, sending, readyToSubmit, editing]);

  const appendMessage = (message) => setMessages((current) => [...current, { id: uid(), ...message }]);

  /* --- Send a message --------------------------------------------------- */
  const send = async (rawText) => {
    const content = String(rawText ?? input).trim();
    if (!content || sending || submitting) return;

    setError(null);

    // Prior turns only: the backend appends the new message itself.
    const history = messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .slice(-10)
      .map((message) => ({ role: message.role, content: message.text }));

    appendMessage({ role: 'user', text: content });
    setInput('');
    setSending(true);
    setEditing(false);

    try {
      const response = await api.chatMessage({ message: content, history, draft });
      const data = response.data;

      appendMessage({
        role: 'assistant',
        text: data.reply,
        aiMode: data.aiMode,
        degraded: data.degraded,
      });

      setDraft(data.draft);
      setMissingFields(data.missingFields || []);
      setReadyToSubmit(Boolean(data.readyToSubmit));
      setMode((current) => (current ? { ...current, aiMode: data.aiMode, isDemoMode: data.aiMode === 'demo' } : current));

      // The status the citizen asked about - straight from MongoDB.
      if (data.intent === 'track' && data.complaint) {
        appendMessage({ role: 'status', complaint: data.complaint });
      }
    } catch (apiError) {
      setError(apiError);
      appendMessage({ role: 'assistant', text: `Sorry, something went wrong: ${apiError.message}`, isError: true });
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  /* --- Confirm and submit ---------------------------------------------- */
  const confirmSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const response = await api.createComplaint({
        category: draft.category,
        description: draft.description,
        location: draft.location,
      });

      const complaint = response.data.complaint;

      appendMessage({ role: 'created', complaint });
      toast.success(`Tracking ID ${complaint.trackingId}`, { title: 'Complaint submitted' });

      // Reset so the citizen can report something else right away.
      setDraft(EMPTY_DRAFT);
      setMissingFields([]);
      setReadyToSubmit(false);
      setEditing(false);
    } catch (apiError) {
      setError(apiError);
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = () => {
    setEditDraft({ ...EMPTY_DRAFT, ...draft });
    setEditing(true);
  };

  const saveEdit = () => {
    const cleaned = {
      category: editDraft.category || null,
      description: (editDraft.description || '').trim() || null,
      location: (editDraft.location || '').trim() || null,
    };
    setDraft(cleaned);
    setMissingFields(
      ['category', 'location', 'description'].filter((field) => {
        if (field === 'description') return !cleaned.description || cleaned.description.length < 10;
        if (field === 'location') return !cleaned.location || cleaned.location.length < 3;
        return !cleaned[field];
      })
    );
    setReadyToSubmit(Boolean(cleaned.category && cleaned.location && cleaned.description.length >= 10));
    setEditing(false);
  };

  const resetConversation = async () => {
    setMessages([]);
    setDraft(EMPTY_DRAFT);
    setMissingFields([]);
    setReadyToSubmit(false);
    setEditing(false);
    setError(null);
    setBooting(true);

    try {
      const greeting = await api.chatGreeting();
      setMessages([{ id: uid(), role: 'assistant', text: greeting.data.reply, aiMode: greeting.data.aiMode }]);
    } catch (apiError) {
      setError(apiError);
    } finally {
      setBooting(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const filledCount = DRAFT_FIELDS.filter(({ key }) => Boolean(draft[key])).length;

  /* ---------------------------------------------------------------------- */
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Report a problem</h1>
          <p className="muted mt-1">
            Describe the issue in your own words. Nothing is filed until you confirm the summary.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {mode?.isDemoMode && (
            <span className="badge bg-amber-50 text-amber-700 ring-amber-200">
              <Info className="h-3.5 w-3.5" aria-hidden="true" />
              Demo mode
            </span>
          )}
          {mode && !mode.isDemoMode && (
            <span className="badge bg-accent-50 text-accent-700 ring-accent-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              AI online
            </span>
          )}

          <button type="button" onClick={resetConversation} className="btn-secondary btn-sm">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            New conversation
          </button>
        </div>
      </div>

      {/* Demo-mode banner */}
      {mode?.isDemoMode && (
        <Alert
          className="mt-4"
          variant="warning"
          title="Rule-based demo mode is active"
          message={mode.notice}
        />
      )}

      {error && (
        <Alert
          className="mt-4"
          variant="error"
          message={error.message}
          errors={Array.isArray(error.details) ? error.details : undefined}
        />
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ------------------------------- Chat ------------------------------ */}
        <section className="flex h-[calc(100vh-16rem)] min-h-[26rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card sm:h-[calc(100vh-15rem)]">
          <header className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-500">
              <Bot className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">CivicFix AI Assistant</p>
              <p className="truncate text-xs text-slate-500">
                Ask a question, report a problem, or check a complaint status
              </p>
            </div>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="chat-scroll flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
            {booting ? (
              <div className="flex items-center justify-center py-16">
                <Spinner label="Starting your conversation..." />
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  if (message.role === 'user') return <UserBubble key={message.id} text={message.text} />;
                  if (message.role === 'status') return <StatusResultCard key={message.id} complaint={message.complaint} />;
                  if (message.role === 'created') return <CreatedCard key={message.id} complaint={message.complaint} />;
                  return <AssistantBubble key={message.id} text={message.text} isError={message.isError} />;
                })}

                {messages.length <= 1 && !sending && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Try one of these
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => send(suggestion)}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-xs text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {sending && (
                  <div className="flex gap-2.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-accent-500">
                      <Bot className="h-4 w-4 text-white" aria-hidden="true" />
                    </span>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-slate-400"
                          style={{ animationDelay: `${index * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Composer */}
          <footer className="border-t border-slate-100 bg-white p-3 sm:p-4">
            <div className="flex items-end gap-2">
              <label htmlFor="chat-input" className="sr-only">
                Your message
              </label>
              <textarea
                id="chat-input"
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the problem, or paste a tracking ID..."
                className="input max-h-32 min-h-[2.75rem] flex-1 resize-none py-3"
                disabled={sending || submitting}
              />
              <button
                type="button"
                onClick={() => send()}
                disabled={!input.trim() || sending || submitting}
                className="btn-primary h-11 w-11 shrink-0 !px-0"
                aria-label="Send message"
              >
                {sending ? <Spinner size="sm" className="text-white" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Press <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans">Enter</kbd> to
              send, <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans">Shift</kbd> +{' '}
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans">Enter</kbd> for a new
              line.
            </p>
          </footer>
        </section>

        {/* --------------------------- Draft panel --------------------------- */}
        <aside className="space-y-4">
          <div className="card-padded">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-title">Complaint draft</h2>
              <span className="badge bg-slate-100 text-slate-600 ring-slate-200">
                {filledCount}/{DRAFT_FIELDS.length}
              </span>
            </div>

            <ul className="mt-4 space-y-3">
              {DRAFT_FIELDS.map(({ key, label, icon: Icon }) => {
                const value = draft[key];
                const isMissing = missingFields.includes(key);

                return (
                  <li key={key} className="flex gap-3">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        value ? 'bg-accent-50' : 'bg-slate-100'
                      }`}
                    >
                      {value ? (
                        <CheckCircle2 className="h-4 w-4 text-accent-600" aria-hidden="true" />
                      ) : (
                        <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                      {value ? (
                        <p className="mt-0.5 break-words text-sm text-slate-700">{value}</p>
                      ) : (
                        <p className={`mt-0.5 text-sm ${isMissing ? 'font-medium text-amber-600' : 'text-slate-400'}`}>
                          {isMissing ? 'Waiting for you...' : 'Not provided'}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Summary + confirmation */}
          {readyToSubmit && !editing && (
            <div className="animate-fade-in-up rounded-xl border border-accent-300 bg-accent-50/60 p-5 shadow-card">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-accent-800">
                <ClipboardList className="h-4 w-4" aria-hidden="true" />
                Review before submitting
              </h3>
              <p className="mt-1.5 text-xs text-accent-700">
                Nothing has been saved yet. Confirm to file this complaint.
              </p>

              <dl className="mt-4 space-y-2.5 rounded-lg border border-accent-200 bg-white p-3.5 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Category</dt>
                  <dd className="mt-1">
                    <CategoryBadge category={draft.category} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Location</dt>
                  <dd className="mt-1 flex items-start gap-1.5 text-slate-700">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                    {draft.location}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</dt>
                  <dd className="mt-1 text-slate-700">{draft.description}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-col gap-2">
                <button type="button" onClick={confirmSubmit} disabled={submitting} className="btn-accent w-full">
                  {submitting ? (
                    <>
                      <Spinner size="sm" className="text-white" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Confirm &amp; submit complaint
                    </>
                  )}
                </button>
                <button type="button" onClick={startEdit} className="btn-secondary w-full">
                  Edit details
                </button>
              </div>
            </div>
          )}

          {/* Inline editor */}
          {editing && (
            <div className="animate-fade-in-up card-padded">
              <div className="flex items-center justify-between">
                <h3 className="section-title">Edit details</h3>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Cancel editing"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="edit-category" className="label">
                    Category
                  </label>
                  <select
                    id="edit-category"
                    className="select"
                    value={editDraft.category || ''}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, category: event.target.value || null }))
                    }
                  >
                    <option value="">Select a category...</option>
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-location" className="label">
                    Location
                  </label>
                  <input
                    id="edit-location"
                    className="input"
                    value={editDraft.location || ''}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, location: event.target.value }))
                    }
                    placeholder="Street, landmark or ward"
                  />
                </div>

                <div>
                  <label htmlFor="edit-description" className="label">
                    Description
                  </label>
                  <textarea
                    id="edit-description"
                    rows={4}
                    className="input resize-y"
                    value={editDraft.description || ''}
                    onChange={(event) =>
                      setEditDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="At least 10 characters"
                  />
                </div>

                <button type="button" onClick={saveEdit} className="btn-primary w-full">
                  Save changes
                </button>
              </div>
            </div>
          )}

          {/* Tips */}
          {!readyToSubmit && !editing && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MessageSquare className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Tips for a good report
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  Mention the <strong className="font-semibold text-slate-700">location</strong> - a street
                  name, landmark or ward.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  Add a short description of what you actually saw.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                  To check an existing complaint, paste its tracking ID.
                </li>
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

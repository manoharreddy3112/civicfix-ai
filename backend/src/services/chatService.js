import {
  AI_MODES,
  DEMO_NOTICE,
  demoReply,
  emptyDraft,
  interpretMessage,
} from './aiService.js';
import { findComplaintForUser } from './complaintService.js';
import { COMPLAINT_CATEGORIES } from '../config/constants.js';

/**
 * ============================================================================
 * Chat orchestration - the ONLY place that decides what the citizen is told.
 * ============================================================================
 * Responsibilities:
 *   - merge the LLM/rule-engine output into a stable complaint draft
 *   - determine which required fields are still missing
 *   - look up REAL complaints for status questions (never invent data)
 *   - block submission until every field is present
 *
 * The assistant itself never writes to the database. A complaint is created
 * exclusively by POST /api/complaints, after explicit citizen confirmation.
 * ============================================================================
 */

/** Field priority: category, then location, then description. */
export const MISSING_ORDER = ['category', 'location', 'description'];

export function normaliseDraft(draft) {
  const base = emptyDraft();
  if (!draft || typeof draft !== 'object') return base;

  const text = (value, max) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, max) : null;
  };

  const category = text(draft.category, 40);
  return {
    category: COMPLAINT_CATEGORIES.find((c) => c.toLowerCase() === category?.toLowerCase()) || null,
    description: text(draft.description, 1000),
    location: text(draft.location, 200),
  };
}

/** Merges new information into the previous draft, keeping the richest data. */
export function mergeDraft(previous, interpretation) {
  const draft = { ...emptyDraft(), ...normaliseDraft(previous) };

  if (interpretation?.category) draft.category = interpretation.category;
  if (interpretation?.location) draft.location = interpretation.location;

  if (interpretation?.description) {
    const next = String(interpretation.description).trim();
    const current = (draft.description || '').trim();

    if (!current) {
      draft.description = next.slice(0, 1000);
    } else if (interpretation.descriptionMode === 'append') {
      // The rule engine hears details across several turns - accumulate them.
      if (!current.toLowerCase().includes(next.toLowerCase())) {
        const separator = /[.!?]$/.test(current) ? ' ' : '. ';
        draft.description = `${current}${separator}${next}`.slice(0, 1000);
      }
    } else if (next.length >= current.length) {
      // The model rewrites the whole summary; only accept genuine improvements.
      draft.description = next.slice(0, 1000);
    }
  }

  return draft;
}

export function missingFields(draft) {
  return MISSING_ORDER.filter((field) => {
    const value = draft?.[field];
    if (field === 'description') return !value || value.trim().length < 10;
    if (field === 'location') return !value || value.trim().length < 3;
    return !value;
  });
}

/** Builds the status reply from the REAL database record. */
function describeComplaintStatus(complaint) {
  const history = complaint.statusHistory || [];
  const latest = history[history.length - 1];
  const submitted = history[0]?.changedAt || complaint.createdAt;
  const fmt = (date) => (date ? new Date(date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown');

  const lines = [
    `Complaint ${complaint.trackingId}`,
    `Category: ${complaint.category}`,
    `Location: ${complaint.location}`,
    `Current status: ${complaint.status}`,
    `Submitted: ${fmt(submitted)}`,
  ];

  if (latest && latest.status !== complaint.status) {
    lines.push(`Latest update (${fmt(latest.changedAt)}): ${latest.status}${latest.note ? ` - ${latest.note}` : ''}`);
  } else if (latest?.note) {
    lines.push(`Latest note from ${latest.changedByName}: ${latest.note}`);
  }

  const tail =
    complaint.status === 'Resolved'
      ? 'This complaint has been resolved. Thank you for helping improve your city!'
      : complaint.status === 'In Progress'
        ? 'Our team is actively working on this. I will show the latest status whenever you check back.'
        : 'The complaint has been received and is awaiting assignment.';

  return `${lines.join('\n')}\n\n${tail}`;
}

function baseResponse({ reply, aiMode, degraded = false, draft = null, complaint = null, intent = 'unclear' }) {
  const safeDraft = draft || emptyDraft();
  const missing = missingFields(safeDraft);
  return {
    reply,
    intent,
    aiMode,
    degraded,
    demoNotice: aiMode === AI_MODES.DEMO ? DEMO_NOTICE : null,
    draft: safeDraft,
    missingFields: missing,
    readyToSubmit: intent !== 'track' && missing.length === 0,
    complaint,
  };
}

/** Handles "where is my complaint?" - always a live database lookup. */
async function handleTrackingIntent({ user, interpretation, draft, aiMode, degraded }) {
  const trackingId = interpretation.trackingId;

  if (!trackingId) {
    return baseResponse({
      reply:
        interpretation.reply ||
        'I can check that for you. Please send the tracking ID from your confirmation (it looks like CIV-2026-A7K3P9).',
      aiMode,
      degraded,
      draft,
      intent: 'track',
    });
  }

  const complaint = await findComplaintForUser({ user, trackingId });

  if (!complaint) {
    // Explicitly refuse to invent anything.
    return baseResponse({
      reply: `I could not find a complaint with the tracking ID ${trackingId} linked to your account. Please double-check the ID - I can only show complaints that you submitted.`,
      aiMode,
      degraded,
      draft,
      intent: 'track',
    });
  }

  return baseResponse({
    reply: describeComplaintStatus(complaint),
    aiMode,
    degraded,
    draft,
    intent: 'track',
    complaint: complaint.toJSON(),
  });
}

/**
 * Main entry point used by the chat controller.
 * @param {object} params
 * @param {object} params.user      authenticated mongoose user
 * @param {string} params.message   citizen's message
 * @param {Array}  [params.history] prior conversation turns (role/content)
 * @param {object} [params.draft]   partial complaint built so far
 */
export async function handleChatMessage({ user, message, history = [], draft = null }) {
  const currentDraft = normaliseDraft(draft);
  const interpretation = await interpretMessage({ message, history, draft: currentDraft });
  const aiMode = interpretation.aiMode;
  const degraded = Boolean(interpretation.degraded);

  if (interpretation.intent === 'track') {
    return handleTrackingIntent({ user, interpretation, draft: currentDraft, aiMode, degraded });
  }

  const mergedDraft = mergeDraft(currentDraft, interpretation);
  const missing = missingFields(mergedDraft);
  const ready = missing.length === 0;

  // The server is authoritative about readiness. If the model disagrees,
  // replace its reply with a deterministic one so we never invite a citizen
  // to "confirm" a complaint that cannot be saved yet.
  let reply = typeof interpretation.reply === 'string' ? interpretation.reply.trim() : '';
  if (!reply || Boolean(interpretation.readyToSubmit) !== ready) {
    reply = demoReply({
      intent: interpretation.intent,
      missingFields: missing,
      draft: mergedDraft,
    });
  }

  return baseResponse({
    reply,
    aiMode,
    degraded,
    draft: mergedDraft,
    intent: interpretation.intent,
  });
}

export { AI_MODES, DEMO_NOTICE };

import OpenAI from 'openai';
import { env, isAiConfigured } from '../config/env.js';
import { COMPLAINT_CATEGORIES, MAX_CHAT_HISTORY, TRACKING_ID_REGEX } from '../config/constants.js';

/**
 * ============================================================================
 * AI interpretation layer
 * ============================================================================
 * The chatbot is intentionally split in two:
 *
 *   1. An LLM (OpenAI) turns free-form citizen language into a STRUCTURED
 *      intent object. It never touches the database.
 *   2. The backend (chatService) owns all business logic: merging the draft,
 *      looking up real complaints, deciding when a summary may be submitted.
 *
 * That separation is what guarantees the assistant can never invent a record,
 * a tracking ID or a status update - the model has no access to any of them.
 *
 * If OPENAI_API_KEY is missing (or the API errors out) the app transparently
 * switches to a clearly-labelled RULE-BASED DEMO MODE so every feature still
 * works for a demo or offline marking session.
 * ============================================================================
 */

export const AI_MODES = {
  OPENAI: 'openai',
  DEMO: 'demo',
};

export const currentAiMode = () => (isAiConfigured() ? AI_MODES.OPENAI : AI_MODES.DEMO);

export const emptyDraft = () => ({ category: null, description: null, location: null });

export const DEMO_NOTICE =
  'Rule-based demo mode is active (no OPENAI_API_KEY configured). Replies come from a deterministic keyword engine, not an LLM.';

// ---------------------------------------------------------------------------
// Rule engine data
// ---------------------------------------------------------------------------

/** Priority order matters: the longest keyword match wins. */
const CATEGORY_KEYWORDS = {
  Pothole: ['pothole', 'pot hole', 'pot-hole', 'road hole', 'hole in the road', 'crater'],
  Garbage: [
    'garbage',
    'trash',
    'rubbish',
    'litter',
    'waste dump',
    'garbage dump',
    'overflowing bin',
    'dustbin',
    'not collected',
  ],
  'Water Leakage': [
    'water leakage',
    'water leak',
    'leaking pipe',
    'pipe burst',
    'burst pipe',
    'water pipe',
    'waterlogging',
    'water logging',
    'leaking tap',
    'sewer overflow',
  ],
  'Broken Streetlight': [
    'streetlight',
    'street light',
    'street-light',
    'lamp post',
    'lamppost',
    'streetlamp',
    'lights are not working',
    'light not working',
    'no light',
    'dark street',
  ],
  'Damaged Road': [
    'damaged road',
    'broken road',
    'road damage',
    'cracked road',
    'road is broken',
    'uneven road',
    'road cave-in',
    'road collapsed',
  ],
};

const TRACK_KEYWORDS = [
  'status',
  'track',
  'tracking',
  'where is my',
  'what happened to',
  'update on',
  'progress of',
  'complaint number',
  'complaint id',
  'reference number',
  'any update',
  'resolved yet',
];

const REPORT_KEYWORDS = [
  'report',
  'complain',
  'complaint about',
  'there is',
  "there's",
  'i want to report',
  'please fix',
  'needs fixing',
  'not working',
  'is broken',
  'are broken',
  'leaking',
  'blocked',
  'overflowing',
];

const GREETING_REGEX = /^(hi|hey|hello|hii+|good\s+(morning|afternoon|evening)|namaste)\b/i;

const LOCATION_REGEX =
  /\b(?:at|in|on|near|behind|beside|opposite|around|outside|inside|by)\s+(?:the\s+|our\s+|my\s+)?([^.,;!?\n]{3,120})/i;

const stripArticle = (value = '') =>
  String(value)
    .replace(/^(the|a|an|our|my|this|that|these|those)\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;!?]+$/, '')
    .trim();

/**
 * Removes conversational scaffolding so the stored description contains the
 * problem rather than the request. "I want to report a pothole" -> "a pothole".
 */
const INTENT_PREFIXES = [
  /^(?:hi|hello|hey|hii+)\b[\s,!.]*/i,
  /^(?:i\s+(?:want|would\s+like|need|wish|'d\s+like)\s+to\s+(?:report|file|register|log|complain\s+about))\b\s*/i,
  /^(?:please\s+(?:fix|repair|look\s+into|address|do\s+something\s+about))\b\s*/i,
  /^(?:i\s+(?:am|'m)\s+reporting)\b\s*/i,
  /^(?:there\s+(?:is|are|'s))\b\s*/i,
];

function stripIntentPrefixes(text = '') {
  let result = String(text).trim();
  let changed = true;

  while (changed) {
    changed = false;
    for (const pattern of INTENT_PREFIXES) {
      const next = result.replace(pattern, '');
      if (next !== result) {
        result = next.trim();
        changed = true;
      }
    }
  }
  return result;
}

const capitalise = (text = '') => (text ? text[0].toUpperCase() + text.slice(1) : text);

// ---------------------------------------------------------------------------
// Rule engine helpers
// ---------------------------------------------------------------------------

/** Returns the single best category for a message, or null. */
export function detectCategory(text = '') {
  const haystack = ` ${String(text).toLowerCase()} `;
  let best = null;
  let bestLength = 0;

  for (const category of COMPLAINT_CATEGORIES) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (!keywords) continue;
    for (const keyword of keywords) {
      if (haystack.includes(keyword) && keyword.length > bestLength) {
        best = category;
        bestLength = keyword.length;
      }
    }
  }
  return best;
}

/** Extracts a tracking ID such as CIV-2026-A7K3P9 from free text. */
export function extractTrackingId(text = '') {
  const match = String(text).toUpperCase().match(/CIV[-\s]?\d{4}[-\s]?[A-Z0-9]{6}/);
  if (!match) return null;
  const compact = match[0].replace(/[\s-]/g, '');
  const candidate = `CIV-${compact.slice(3, 7)}-${compact.slice(7)}`;
  return TRACKING_ID_REGEX.test(candidate) ? candidate : null;
}

/** Extracts a location phrase using common English prepositions. */
export function extractLocation(text = '') {
  const match = String(text).match(LOCATION_REGEX);
  if (!match) return null;

  const value = stripArticle(match[1]);
  // Guard against capturing sentence fragments such as "a hurry".
  if (value.length < 3 || /^(least|all|general|fact|order|touch|future|short|time|need|case)\b/i.test(value)) {
    return null;
  }
  return { value: value.slice(0, 200), raw: match[0] };
}

function detectIntent({ text, draft }) {
  const lower = String(text).toLowerCase();

  if (extractTrackingId(text)) return 'track';
  if (TRACK_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    // "I want to report the status of..." is rare; tracking wins here.
    return 'track';
  }
  if (detectCategory(text) || REPORT_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return 'report';
  }
  if (GREETING_REGEX.test(text.trim())) return 'greeting';

  // A short answer while we are mid-way through collecting a complaint is
  // part of that complaint flow (e.g. the citizen replies with a street name).
  const pending = draft?.category || draft?.description;
  if (pending && text.trim().length <= 200) return 'report';

  return 'unclear';
}

/** The deterministic fallback interpreter. */
export function ruleBasedInterpret({ message = '', draft = null }) {
  const text = String(message).trim();
  const intent = detectIntent({ text, draft });

  const category = detectCategory(text);
  const trackingId = extractTrackingId(text);
  const locationMatch = extractLocation(text);

  // Was the assistant's last meaningful question "where exactly is it located?"
  const awaitingLocation = Boolean(draft?.category && !draft?.location);

  // If so, a short reply IS the location - take the whole phrase, including
  // compound answers such as "Sector 12, opposite the community hall".
  const locationIsAnswer =
    awaitingLocation && !category && !trackingId && text.length > 0 && text.length <= 200;

  const location = locationIsAnswer
    ? stripArticle(text).slice(0, 200) || null
    : locationMatch?.value || null;

  let description = null;
  if (intent === 'report' && !locationIsAnswer) {
    const withoutLocation = locationMatch ? text.replace(locationMatch.raw, ' ') : text;
    const cleaned = capitalise(stripIntentPrefixes(withoutLocation).replace(/\s+/g, ' ').trim());

    // A "description" that merely restates the category ("a water leakage")
    // carries no information - better to ask the citizen for real detail.
    const descriptor = stripArticle(cleaned).toLowerCase();
    const categoryWord = stripArticle(category || '').toLowerCase();
    const restatesCategory = Boolean(categoryWord) && descriptor === categoryWord;

    if (cleaned.length >= 10 && !restatesCategory) description = cleaned.slice(0, 1000);
  }

  return {
    intent,
    category,
    description,
    // The engine hears fragments over several turns, so descriptions are
    // accumulated. The LLM path rewrites instead (see normaliseInterpretation).
    descriptionMode: 'append',
    location,
    trackingId,
    reply: null, // composed by chatService, which knows the full picture
    aiMode: AI_MODES.DEMO,
  };
}

/** Builds the demo-mode conversational reply from what is still missing. */
export function demoReply({ intent, missingFields, draft }) {
  if (intent === 'greeting') {
    return "Hello! I'm CivicFix AI. Tell me about a public problem you've spotted - for example \"there's a large pothole on Main Street\" - or share a tracking ID to check an existing complaint.";
  }

  if (intent === 'track') {
    return 'Sure, I can check that for you. Please share your tracking ID (it looks like CIV-2026-A7K3P9).';
  }

  if (intent === 'unclear' && !missingFields.length) {
    return "I'm not sure I understood that. You can describe a problem (\"garbage is piling up near the market\") or send me a tracking ID to check its status. Which would you like to do?";
  }

  if (missingFields.includes('category')) {
    const where = draft.location ? ` at ${draft.location}` : '';
    return `I've noted there's an issue${where}. Which category fits best? Choose one of: ${COMPLAINT_CATEGORIES.join(', ')}.`;
  }

  // Location is deliberately asked for before the description ("especially the location").
  if (missingFields.includes('location')) {
    return `Thanks, I've recorded this as "${draft.category}". Where exactly is it located? A street name, landmark or ward will help the crew find it.`;
  }

  if (missingFields.includes('description')) {
    return 'Got it. Could you describe the problem in a sentence or two so our team knows what to expect?';
  }

  return 'Thanks! I have everything I need. Please review the summary below and confirm to submit your complaint.';
}

// ---------------------------------------------------------------------------
// OpenAI path
// ---------------------------------------------------------------------------

let openaiClient = null;

function getClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.openaiApiKey,
      // Lets a free/most providers work: any OpenAI-compatible base URL
      // (Google Gemini, Groq, OpenRouter, Ollama, ...). Unset => OpenAI.
      ...(env.openaiBaseUrl ? { baseURL: env.openaiBaseUrl } : {}),
      // Local models (Ollama on CPU) can be slow on the very first request
      // while the model loads into memory, so allow a generous timeout.
      timeout: 60_000,
      maxRetries: 1,
    });
  }
  return openaiClient;
}

export function buildSystemPrompt(draft = null, trackingHint = '') {
  return `You are CivicFix AI, the assistant for a municipal public-complaint portal.
You help a citizen either (a) REPORT a public problem or (b) CHECK THE STATUS of an existing complaint.

ALLOWED CATEGORIES - use these exact strings, or null:
${COMPLAINT_CATEGORIES.map((c) => `- "${c}"`).join('\n')}

CURRENT DRAFT (information already collected - never ask for these again):
${JSON.stringify(draft || { category: null, description: null, location: null })}

HARD RULES:
1. Respond with ONE valid JSON object and nothing else. No markdown, no code fences.
2. You have NO database access. NEVER invent, guess or fabricate a complaint record, tracking ID, status or resolution. If the citizen asks about status, only copy any tracking ID they typed into "trackingId" and set intent to "track" - the server looks it up.
3. Ask for AT MOST ONE missing piece of information per reply, and ALWAYS ask for the LOCATION first if it is missing.
4. "reply" must be friendly, natural and 1-3 short sentences.
5. Infer the category from the description even if the citizen never names it.
6. Keep "description" a clean, factual summary of the problem (not the raw chat text).
7. Set "readyToSubmit" to true only when category, description and location are ALL known.
8. NEVER put a question, an instruction or a request for information inside "category", "description" or "location". If a value is not known yet, set that field to null and ask for it in "reply" instead.
${trackingHint}

OUTPUT JSON SHAPE:
{
  "intent": "report" | "track" | "greeting" | "unclear",
  "category": string | null,
  "description": string | null,
  "location": string | null,
  "trackingId": string | null,
  "reply": string,
  "readyToSubmit": boolean
}`;
}

/**
 * Small / cheaper models sometimes put the question they WANT TO ASK into a
 * data field instead of leaving it null - e.g.
 *   { location: "Please provide the street name or nearest landmark" }
 * Because any non-empty value counts as "collected", that would be stored as
 * the citizen's real location. Anything that reads like a question or an
 * instruction aimed at the user is therefore rejected.
 */
function looksLikeQuestionOrInstruction(value) {
  if (!value) return false;
  const text = String(value).trim();
  if (text.includes('?')) return true;
  return /^(please|kindly|could you|can you|would you|tell me|provide|share|specify|enter|describe|give me|what|where|which|who|when|how)\b/i.test(
    text
  );
}

/** Normalises whatever the model returned into our internal contract. */
function normaliseInterpretation(parsed, aiMode) {
  const rawCategory = typeof parsed.category === 'string' ? parsed.category.trim() : null;
  const category = rawCategory
    ? COMPLAINT_CATEGORIES.find((c) => c.toLowerCase() === rawCategory.toLowerCase()) || null
    : null;

  const intent = ['report', 'track', 'greeting', 'unclear'].includes(parsed.intent)
    ? parsed.intent
    : 'unclear';

  const asString = (value, max) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, max) : null;
  };

  const rawTracking = asString(parsed.trackingId, 32);
  const trackingId = rawTracking ? extractTrackingId(rawTracking) : null;

  const description = asString(parsed.description, 1000);
  const location = asString(parsed.location, 200);

  return {
    intent,
    category,
    // Drop values that are really the assistant's question, not citizen data.
    description: looksLikeQuestionOrInstruction(description) ? null : description,
    // The model returns a clean, complete summary each time - replace, don't append.
    descriptionMode: 'replace',
    location: looksLikeQuestionOrInstruction(location) ? null : location,
    trackingId,
    reply: asString(parsed.reply, 1200),
    aiMode,
    readyToSubmit: Boolean(parsed.readyToSubmit),
  };
}

function safeParseJson(raw = '') {
  const text = String(raw).trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // Tolerate models that wrap JSON in prose or code fences.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Interprets a citizen message.
 * @returns {Promise<{intent:string,category:?string,description:?string,location:?string,
 *                    trackingId:?string,reply:?string,aiMode:string,degraded?:boolean}>}
 */
export async function interpretMessage({ message, history = [], draft = null }) {
  if (!isAiConfigured()) {
    return ruleBasedInterpret({ message, draft });
  }

  const trackingHint = extractTrackingId(message)
    ? '\n8. The citizen already supplied a tracking ID in this message - copy it verbatim into "trackingId".'
    : '';

  const messages = [
    { role: 'system', content: buildSystemPrompt(draft, trackingHint) },
    ...history.slice(-MAX_CHAT_HISTORY).map((entry) => ({
      role: entry.role === 'assistant' ? 'assistant' : 'user',
      content: String(entry.content || '').slice(0, 2000),
    })),
    { role: 'user', content: String(message).slice(0, 2000) },
  ];
  const baseRequest = { model: env.openaiModel, temperature: 0.2, messages };

  try {
    let completion;
    try {
      // Preferred: JSON mode keeps the reply machine-parseable.
      completion = await getClient().chat.completions.create({
        ...baseRequest,
        response_format: { type: 'json_object' },
      });
    } catch (responseFormatError) {
      // Not every OpenAI-compatible provider supports response_format.
      // Retry once in plain mode; the system prompt still asks for JSON and
      // safeParseJson() tolerates prose around the object.
      console.warn(
        '[ai] JSON mode was rejected by the provider, retrying without response_format:',
        responseFormatError.message
      );
      completion = await getClient().chat.completions.create(baseRequest);
    }

    const parsed = safeParseJson(completion?.choices?.[0]?.message?.content);
    if (!parsed) throw new Error('Model did not return parseable JSON');

    return normaliseInterpretation(parsed, AI_MODES.OPENAI);
  } catch (error) {
    // Never break the citizen's flow because the AI provider is down:
    // degrade gracefully to the deterministic engine and flag it.
    console.error('[ai] OpenAI call failed, falling back to rule-based engine:', error.message);
    return {
      ...ruleBasedInterpret({ message, draft }),
      aiMode: AI_MODES.DEMO,
      degraded: true,
    };
  }
}

/** Used by tests / health checks. */
export function resetClient() {
  openaiClient = null;
}

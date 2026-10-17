/**
 * Thin fetch wrapper around the CivicFix REST API.
 *
 * - reads the JWT from localStorage and attaches it as a Bearer token
 * - normalises errors into a single ApiError type
 * - broadcasts an "unauthorized" event when the session dies mid-flight
 */

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const TOKEN_KEY = 'civicfix.token';
export const UNAUTHORIZED_EVENT = 'civicfix:unauthorized';

export const tokenStore = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable (private mode) - session stays in memory only */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export class ApiError extends Error {
  constructor(message, { status = 0, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  /** Maps backend field errors onto a { fieldName: message } object. */
  get fieldErrors() {
    if (!Array.isArray(this.details)) return {};
    return this.details.reduce((acc, item) => {
      if (item?.field && !acc[item.field]) acc[item.field] = item.message;
      return acc;
    }, {});
  }
}

async function request(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the server. Please check that the backend is running.', {
      status: 0,
    });
  }

  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth) {
      tokenStore.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(payload?.message || `Request failed with status ${response.status}.`, {
      status: response.status,
      details: payload?.errors,
    });
  }

  return payload;
}

const qs = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const api = {
  // --- Infrastructure ------------------------------------------------------
  health: () => request('/health', { auth: false }),

  // --- Auth ----------------------------------------------------------------
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),

  // --- Chatbot -------------------------------------------------------------
  chatMode: () => request('/chat/mode'),
  chatGreeting: () => request('/chat/greeting'),
  chatMessage: (payload) => request('/chat/message', { method: 'POST', body: payload }),

  // --- Citizen complaints --------------------------------------------------
  createComplaint: (payload) => request('/complaints', { method: 'POST', body: payload }),
  myComplaints: (params) => request(`/complaints${qs(params)}`),
  myStats: () => request('/complaints/stats'),
  complaint: (trackingId) => request(`/complaints/${encodeURIComponent(trackingId)}`),

  // --- Administrator -------------------------------------------------------
  adminComplaints: (params) => request(`/admin/complaints${qs(params)}`),
  adminStats: () => request('/admin/stats'),
  adminComplaint: (trackingId) => request(`/admin/complaints/${encodeURIComponent(trackingId)}`),
  adminUpdateStatus: (trackingId, payload) =>
    request(`/admin/complaints/${encodeURIComponent(trackingId)}/status`, {
      method: 'PATCH',
      body: payload,
    }),
};

export default api;

import Complaint from '../models/Complaint.js';
import ApiError from '../utils/ApiError.js';
import { generateTrackingId, normaliseTrackingId } from '../utils/trackingId.js';
import { parsePagination, paginationMeta } from '../utils/pagination.js';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS,
  COMPLAINT_STATUSES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../config/constants.js';
import { ROLES } from '../models/User.js';

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const CITIZEN_PUBLIC_FIELDS = 'name email';

/** Status-count aggregation -> stable shape used by both dashboards. */
function shapeCounts(rows = []) {
  const counts = { submitted: 0, inProgress: 0, resolved: 0 };
  for (const row of rows) {
    if (row._id === COMPLAINT_STATUS.SUBMITTED) counts.submitted = row.count;
    if (row._id === COMPLAINT_STATUS.IN_PROGRESS) counts.inProgress = row.count;
    if (row._id === COMPLAINT_STATUS.RESOLVED) counts.resolved = row.count;
  }
  const total = counts.submitted + counts.inProgress + counts.resolved;
  return { total, ...counts };
}

/**
 * Creates a complaint with a unique, human-readable tracking ID.
 * The unique index on `trackingId` is the source of truth; on the very
 * unlikely collision we simply generate another ID and retry.
 */
export async function createComplaint({ citizen, draft, source = 'chatbot' }) {
  const payload = {
    category: draft.category,
    description: draft.description,
    location: draft.location,
    source,
  };

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const complaint = Complaint.buildFromDraft({
      trackingId: generateTrackingId(),
      citizen,
      draft: payload,
    });

    try {
      await complaint.save();
      return complaint;
    } catch (error) {
      const isTrackingCollision = error.code === 11000 && error.keyPattern?.trackingId;
      if (isTrackingCollision && attempt < 5) continue;
      throw error;
    }
  }

  throw ApiError.internal('Could not allocate a unique tracking ID. Please try again.');
}

/** Citizen-scoped listing. Never returns another citizen's complaints. */
export async function listCitizenComplaints({ citizenId, status, category, q } = {}) {
  const { page, limit, skip } = parsePagination(arguments[0] || {}, {
    defaultLimit: DEFAULT_PAGE_SIZE,
    maxLimit: MAX_PAGE_SIZE,
  });

  const filter = { citizen: citizenId };
  if (status && COMPLAINT_STATUSES.includes(status)) filter.status = status;
  if (category && COMPLAINT_CATEGORIES.includes(category)) filter.category = category;
  if (q) filter.trackingId = { $regex: `^${escapeRegex(normaliseTrackingId(q))}`, $options: 'i' };

  const [items, total] = await Promise.all([
    Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Complaint.countDocuments(filter),
  ]);

  return { items, meta: paginationMeta({ page, limit, total }) };
}

/**
 * Ownership enforcement for citizens: the query itself scopes to the citizen,
 * so a foreign tracking ID simply looks "not found" (no existence leak).
 * Administrators may look up any complaint.
 */
export async function findComplaintForUser({ user, trackingId }) {
  const id = normaliseTrackingId(trackingId);
  const filter = user.role === ROLES.ADMIN ? { trackingId: id } : { trackingId: id, citizen: user._id };
  return Complaint.findOne(filter).populate('citizen', CITIZEN_PUBLIC_FIELDS);
}

/** Same as above but throws a 404 - used by the REST detail endpoint. */
export async function getComplaintForUser({ user, trackingId }) {
  const complaint = await findComplaintForUser({ user, trackingId });
  if (!complaint) {
    throw ApiError.notFound(
      user.role === ROLES.ADMIN
        ? `No complaint found with tracking ID ${normaliseTrackingId(trackingId)}.`
        : 'No complaint with that tracking ID belongs to your account.'
    );
  }
  return complaint;
}

/** Administrator listing with search + category/status filters. */
export async function listAllComplaints({ status, category, q, sort = 'newest', page, limit } = {}) {
  const pagination = parsePagination({ page, limit }, {
    defaultLimit: DEFAULT_PAGE_SIZE,
    maxLimit: MAX_PAGE_SIZE,
  });

  const filter = {};
  if (status && COMPLAINT_STATUSES.includes(status)) filter.status = status;
  if (category && COMPLAINT_CATEGORIES.includes(category)) filter.category = category;

  if (q) {
    const term = escapeRegex(String(q).trim());
    const normalised = normaliseTrackingId(q);
    filter.$or = [
      { trackingId: { $regex: normalised, $options: 'i' } },
      { description: { $regex: term, $options: 'i' } },
      { location: { $regex: term, $options: 'i' } },
    ];
  }

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    updated: { lastStatusAt: -1 },
  };

  const [items, total] = await Promise.all([
    Complaint.find(filter)
      .sort(sortMap[sort] || sortMap.newest)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate('citizen', CITIZEN_PUBLIC_FIELDS),
    Complaint.countDocuments(filter),
  ]);

  return { items, meta: paginationMeta({ ...pagination, total }) };
}

/** Applies an audited status change. Administrators only. */
export async function updateComplaintStatus({ trackingId, status, note = '', actor }) {
  if (!COMPLAINT_STATUSES.includes(status)) {
    throw ApiError.badRequest(`Status must be one of: ${COMPLAINT_STATUSES.join(', ')}`);
  }

  const complaint = await Complaint.findOne({ trackingId: normaliseTrackingId(trackingId) });
  if (!complaint) {
    throw ApiError.notFound(`No complaint found with tracking ID ${normaliseTrackingId(trackingId)}.`);
  }

  const trimmedNote = String(note || '').trim();
  if (complaint.status === status && !trimmedNote) {
    throw ApiError.badRequest(`This complaint is already marked "${status}".`);
  }

  complaint.addStatusChange({ status, actor, note: trimmedNote });
  await complaint.save();
  await complaint.populate('citizen', CITIZEN_PUBLIC_FIELDS);

  return complaint;
}

/** Dashboard summary for one citizen. */
export async function getCitizenStats(citizenId) {
  const [rows, byCategoryRows, recent] = await Promise.all([
    Complaint.aggregate([{ $match: { citizen: citizenId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $match: { citizen: citizenId } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
    Complaint.find({ citizen: citizenId }).sort({ createdAt: -1 }).limit(5),
  ]);

  return {
    counts: shapeCounts(rows),
    byCategory: byCategoryRows.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {}),
    recent: recent.map((item) => item.toJSON()),
  };
}

/** Platform-wide summary for the administrator dashboard. */
export async function getAdminStats() {
  const [rows, byCategoryRows, recent] = await Promise.all([
    Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    Complaint.find().sort({ createdAt: -1 }).limit(5).populate('citizen', CITIZEN_PUBLIC_FIELDS),
  ]);

  return {
    counts: shapeCounts(rows),
    byCategory: byCategoryRows.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {}),
    recent: recent.map((item) => item.toJSON()),
  };
}

export { shapeCounts, escapeRegex };

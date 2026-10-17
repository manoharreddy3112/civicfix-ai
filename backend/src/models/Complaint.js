import mongoose from 'mongoose';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS,
  COMPLAINT_STATUSES,
} from '../config/constants.js';

/**
 * Immutable audit entry recorded for every status change.
 * Stores a denormalised snapshot of the actor so the history stays readable
 * even if the user account is later renamed or removed.
 */
const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: {
        values: COMPLAINT_STATUSES,
        message: `Status must be one of: ${COMPLAINT_STATUSES.join(', ')}`,
      },
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
      default: '',
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    changedByName: {
      type: String,
      default: 'System',
      trim: true,
    },
    changedByRole: {
      type: String,
      enum: ['citizen', 'admin', 'system'],
      default: 'system',
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    trackingId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^CIV-\d{4}-[A-Z0-9]{6}$/, 'Invalid tracking ID format'],
    },
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A complaint must belong to a citizen'],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: COMPLAINT_CATEGORIES,
        message: `Category must be one of: ${COMPLAINT_CATEGORIES.join(', ')}`,
      },
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      minlength: [3, 'Location must be at least 3 characters'],
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    status: {
      type: String,
      enum: {
        values: COMPLAINT_STATUSES,
        message: `Status must be one of: ${COMPLAINT_STATUSES.join(', ')}`,
      },
      default: COMPLAINT_STATUS.SUBMITTED,
      index: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    // How the complaint was created - the chatbot is the primary path.
    source: {
      type: String,
      enum: ['chatbot', 'form', 'admin'],
      default: 'chatbot',
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    lastStatusAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// Indexes (query patterns: citizen dashboards, admin filters, tracking search)
// ---------------------------------------------------------------------------
complaintSchema.index({ citizen: 1, createdAt: -1 });
complaintSchema.index({ status: 1, category: 1 });
complaintSchema.index({ createdAt: -1 });
// Case-insensitive search on description/location for the admin table.
complaintSchema.index({ description: 'text', location: 'text' });

/** Seed the audit trail and keep derived fields consistent. */
complaintSchema.pre('validate', function seedHistory(next) {
  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory = [
      {
        status: this.status || COMPLAINT_STATUS.SUBMITTED,
        note: 'Complaint submitted by citizen',
        changedBy: this.citizen,
        changedByName: 'Citizen',
        changedByRole: 'citizen',
        changedAt: new Date(),
      },
    ];
  }
  next();
});

complaintSchema.pre('save', function syncDerivedFields(next) {
  if (this.isModified('status')) {
    this.lastStatusAt = new Date();
    this.resolvedAt = this.status === COMPLAINT_STATUS.RESOLVED ? new Date() : null;
  }
  next();
});

/**
 * Appends an audited status change. Used by the admin flow.
 * @param {object} params
 * @param {string} params.status   new status
 * @param {object} params.actor    mongoose User document performing the change
 * @param {string} [params.note]   optional administrator note
 */
complaintSchema.methods.addStatusChange = function addStatusChange({ status, actor, note = '' }) {
  if (!COMPLAINT_STATUSES.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  this.status = status;
  this.statusHistory.push({
    status,
    note: note || '',
    changedBy: actor?._id || null,
    changedByName: actor?.name || 'System',
    changedByRole: actor?.role || 'system',
    changedAt: new Date(),
  });
  return this;
};

/** Creates a new complaint document with a citizen-authored history entry. */
complaintSchema.statics.buildFromDraft = function buildFromDraft({ trackingId, citizen, draft }) {
  return new this({
    trackingId,
    citizen: citizen._id,
    category: draft.category,
    description: draft.description,
    location: draft.location,
    status: COMPLAINT_STATUS.SUBMITTED,
    source: draft.source || 'chatbot',
    statusHistory: [
      {
        status: COMPLAINT_STATUS.SUBMITTED,
        note: 'Complaint submitted by citizen',
        changedBy: citizen._id,
        changedByName: citizen.name,
        changedByRole: 'citizen',
        changedAt: new Date(),
      },
    ],
  });
};

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;

/**
 * Shared UI constants.
 * These mirror backend/src/config/constants.js - the backend remains the
 * source of truth and re-validates everything it receives.
 */

export const CATEGORIES = [
  'Pothole',
  'Garbage',
  'Water Leakage',
  'Broken Streetlight',
  'Damaged Road',
  'Other',
];

export const STATUSES = ['Submitted', 'In Progress', 'Resolved'];

/** Tailwind classes for the status pills. */
export const STATUS_STYLES = {
  Submitted: {
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    dot: 'bg-amber-500',
    solid: 'bg-amber-500',
    soft: 'bg-amber-50 text-amber-700',
  },
  'In Progress': {
    badge: 'bg-brand-50 text-brand-700 ring-brand-200',
    dot: 'bg-brand-500',
    solid: 'bg-brand-600',
    soft: 'bg-brand-50 text-brand-700',
  },
  Resolved: {
    badge: 'bg-accent-50 text-accent-700 ring-accent-200',
    dot: 'bg-accent-500',
    solid: 'bg-accent-600',
    soft: 'bg-accent-50 text-accent-700',
  },
};

export const statusStyle = (status) => STATUS_STYLES[status] || STATUS_STYLES.Submitted;

/** Tailwind classes for category chips. */
export const CATEGORY_STYLES = {
  Pothole: 'bg-orange-50 text-orange-700 ring-orange-200',
  Garbage: 'bg-lime-50 text-lime-700 ring-lime-200',
  'Water Leakage': 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  'Broken Streetlight': 'bg-yellow-50 text-yellow-800 ring-yellow-200',
  'Damaged Road': 'bg-rose-50 text-rose-700 ring-rose-200',
  Other: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export const categoryStyle = (category) => CATEGORY_STYLES[category] || CATEGORY_STYLES.Other;

export const DEMO_MODE_LABEL = 'Demo mode';

export const ROLES = { CITIZEN: 'citizen', ADMIN: 'admin' };

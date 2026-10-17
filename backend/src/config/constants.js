/**
 * Domain constants shared by models, services and validators.
 * Kept in one file so the allowed statuses/categories can never drift apart.
 */

export const ROLES = {
  CITIZEN: 'citizen',
  ADMIN: 'admin',
};

export const USER_ROLES = Object.values(ROLES);

export const COMPLAINT_STATUS = {
  SUBMITTED: 'Submitted',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
};

export const COMPLAINT_STATUSES = Object.values(COMPLAINT_STATUS);

export const COMPLAINT_CATEGORIES = [
  'Pothole',
  'Garbage',
  'Water Leakage',
  'Broken Streetlight',
  'Damaged Road',
  'Other',
];

export const TRACKING_ID_REGEX = /^CIV-\d{4}-[A-Z0-9]{6}$/;

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
export const MAX_CHAT_HISTORY = 20;

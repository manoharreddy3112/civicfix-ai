import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  getComplaint,
  getStats,
  listComplaints,
  updateStatus,
} from '../controllers/adminController.js';
import { adminOnly, protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, TRACKING_ID_REGEX } from '../config/constants.js';

const router = Router();

// Authentication + role-based access control for the whole subtree.
router.use(protect, adminOnly);

const listRules = [
  query('status').optional().isIn(COMPLAINT_STATUSES),
  query('category').optional().isIn(COMPLAINT_CATEGORIES),
  query('q').optional().isString().trim().isLength({ max: 80 }),
  query('sort').optional().isIn(['newest', 'oldest', 'updated']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

const trackingIdRule = [
  param('trackingId')
    .isString()
    .trim()
    .toUpperCase()
    .matches(TRACKING_ID_REGEX)
    .withMessage('Tracking ID must look like CIV-2026-A7K3P9'),
];

const statusRules = [
  ...trackingIdRule,
  body('status')
    .isString()
    .trim()
    .isIn(COMPLAINT_STATUSES)
    .withMessage(`Status must be one of: ${COMPLAINT_STATUSES.join(', ')}`),
  body('note').optional().isString().trim().isLength({ max: 500 }).withMessage('Note cannot exceed 500 characters'),
];

router.get('/stats', getStats);
router.get('/complaints', listRules, validate, listComplaints);
router.get('/complaints/:trackingId', trackingIdRule, validate, getComplaint);
router.patch('/complaints/:trackingId/status', statusRules, validate, updateStatus);

export default router;

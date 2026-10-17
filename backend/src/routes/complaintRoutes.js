import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createComplaint,
  getComplaint,
  getMyStats,
  listMyComplaints,
} from '../controllers/complaintController.js';
import { protect, citizenOnly } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, TRACKING_ID_REGEX } from '../config/constants.js';

const router = Router();

// Citizens only: administrators manage complaints through /api/admin.
router.use(protect, citizenOnly);

const createRules = [
  body('category')
    .isString()
    .trim()
    .isIn(COMPLAINT_CATEGORIES)
    .withMessage(`Category must be one of: ${COMPLAINT_CATEGORIES.join(', ')}`),
  body('description')
    .isString()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  body('location')
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Location must be between 3 and 200 characters'),
  body('source').optional().isIn(['chatbot', 'form']),
];

const listRules = [
  query('status').optional().isIn(COMPLAINT_STATUSES),
  query('category').optional().isIn(COMPLAINT_CATEGORIES),
  query('q').optional().isString().trim().isLength({ max: 60 }),
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

// NOTE: /stats must be declared before /:trackingId or it would be captured
// as a tracking ID.
router.get('/stats', getMyStats);
router.route('/').post(createRules, validate, createComplaint).get(listRules, validate, listMyComplaints);
router.get('/:trackingId', trackingIdRule, validate, getComplaint);

export default router;

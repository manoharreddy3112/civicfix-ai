import { Router } from 'express';
import { body } from 'express-validator';
import { getGreeting, getMode, sendMessage } from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { chatLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// The chatbot is available to any authenticated user (citizens use it to
// report; administrators can use it to look up a complaint by tracking ID).
router.use(protect);

const messageRules = [
  body('message')
    .isString()
    .withMessage('Message must be text')
    .trim()
    .notEmpty()
    .withMessage('Message cannot be empty')
    .isLength({ max: 2000 })
    .withMessage('Message cannot exceed 2000 characters'),
  body('history').optional().isArray({ max: 20 }).withMessage('History must be an array of at most 20 turns'),
  body('history.*.role').optional().isIn(['user', 'assistant']).withMessage('History role must be user or assistant'),
  body('history.*.content').optional().isString().isLength({ max: 2000 }),
  body('draft').optional({ nullable: true }).isObject().withMessage('Draft must be an object'),
];

router.get('/mode', getMode);
router.get('/greeting', getGreeting);
router.post('/message', chatLimiter, messageRules, validate, sendMessage);

export default router;

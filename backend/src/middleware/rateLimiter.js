import rateLimit from 'express-rate-limit';
import { isTest } from '../config/env.js';

const skip = () => isTest;

/**
 * Global limiter: generous, protects the API from accidental flooding.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, message: 'Too many requests. Please slow down and try again shortly.' },
});

/**
 * Auth limiter: slows down credential-stuffing / brute-force attempts.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes and try again.',
  },
});

/**
 * Chat limiter: keeps OpenAI usage (and cost) bounded.
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { success: false, message: 'Too many chat messages. Please wait a moment before continuing.' },
});

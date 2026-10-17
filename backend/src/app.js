import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { env, isTest } from './config/env.js';
import { databaseState } from './config/db.js';
import { currentAiMode } from './services/aiService.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import ApiError from './utils/ApiError.js';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from './config/constants.js';

import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

// Behind nginx / a reverse proxy we want the real client IP for rate limiting.
app.set('trust proxy', 1);
app.disable('x-powered-by');

// --- Security & parsing -----------------------------------------------------
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// --- CORS -------------------------------------------------------------------
// Supports a comma-separated allow list. Requests without an Origin header
// (same-origin via nginx, curl, tests) are always allowed.
const allowedOrigins = String(env.corsOrigin || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new ApiError(403, `Origin ${origin} is not allowed by CORS policy.`));
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// --- Logging & rate limiting -----------------------------------------------
if (!isTest) {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}
app.use(globalLimiter);

// --- Health check (also used by the Docker HEALTHCHECK) --------------------
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      environment: env.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
      database: databaseState(),
      ai: { mode: currentAiMode(), model: env.openaiModel },
      categories: COMPLAINT_CATEGORIES,
      statuses: COMPLAINT_STATUSES,
      timestamp: new Date().toISOString(),
    },
  });
});

// --- API routes -------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'CivicFix AI API',
    docs: 'See README.md for the full endpoint reference.',
    health: '/api/health',
  });
});

// --- Error handling (must be last) -----------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

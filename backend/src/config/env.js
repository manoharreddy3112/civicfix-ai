import dotenv from 'dotenv';

dotenv.config();

/**
 * Central, validated application configuration.
 * Everything the app needs is read from environment variables exactly once,
 * so no other module touches `process.env` directly.
 */

const bool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const DEV_JWT_SECRET = 'dev-only-insecure-jwt-secret-change-me';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: num(process.env.PORT, 5000),

  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/civicfix',

  jwtSecret: process.env.JWT_SECRET || DEV_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  openaiApiKey: (process.env.OPENAI_API_KEY || '').trim(),
  // Optional: point the AI layer at any OpenAI-compatible endpoint
  // (Google Gemini, Groq, OpenRouter, Ollama, Azure, ...).
  // Empty => the official OpenAI API.
  openaiBaseUrl: (process.env.OPENAI_BASE_URL || '').trim() || undefined,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  adminName: process.env.ADMIN_NAME || 'CivicFix Administrator',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@civicfix.ai',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@12345',
  seedAdminOnStart: bool(process.env.SEED_ADMIN_ON_START, false),
};

export const isTest = env.nodeEnv === 'test';
export const isProduction = env.nodeEnv === 'production';

/** True when a real OpenAI key is present, otherwise the app runs in demo mode. */
export const isAiConfigured = () => Boolean(env.openaiApiKey);

/** Human readable warning list surfaced at boot. */
export const configWarnings = () => {
  const warnings = [];

  if (isProduction && env.jwtSecret === DEV_JWT_SECRET) {
    warnings.push(
      'JWT_SECRET is still the insecure development default while NODE_ENV=production. Set a real secret!'
    );
  }
  if (isProduction && env.jwtSecret.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters long.');
  }
  if (!isAiConfigured()) {
    warnings.push(
      'OPENAI_API_KEY is not set - the chatbot runs in RULE-BASED DEMO MODE. All other features work normally.'
    );
  }
  if (isProduction && env.jwtSecret === DEV_JWT_SECRET && env.adminPassword === 'Admin@12345') {
    warnings.push('Using the default administrator password - change ADMIN_PASSWORD before deploying.');
  }

  return warnings;
};

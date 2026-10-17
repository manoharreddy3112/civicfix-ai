import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import { isTest } from '../config/env.js';

/** 404 handler for unmatched routes. */
export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Centralised error handler. Converts every known error shape into a
 * consistent JSON envelope and never leaks stack traces in production.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let details = error.details;

  // Mongoose schema validation
  if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(error.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  // Mongoose bad ObjectId / bad cast
  if (error instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for "${error.path}"`;
  }

  // MongoDB duplicate key
  if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || 'field';
    message =
      field === 'trackingId'
        ? 'A tracking ID collision occurred. Please try again.'
        : `That ${field} is already registered.`;
    details = [{ field, message }];
  }

  // JWT errors raised outside of the auth middleware
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please log in again.';
  }
  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again.';
  }

  // Payload too large (express.json)
  if (error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request payload is too large.';
  }
  if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body must be valid JSON.';
  }

  if (statusCode >= 500 && !isTest) {
    console.error('[error]', error);
  }

  const body = { success: false, message };
  if (details) body.errors = details;
  if (!isTest && statusCode >= 500) body.stack = error.stack;

  res.status(statusCode).json(body);
}

export default errorHandler;

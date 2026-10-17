import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/User.js';
import { ROLES } from '../config/constants.js';

/** Signs a JWT for a user document. */
export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
};

/**
 * Requires a valid JWT. Loads a *fresh* user document from MongoDB so role
 * changes and deleted accounts take effect immediately.
 */
export const protect = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Authentication required. Please log in.');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Your session has expired. Please log in again.'
        : 'Invalid authentication token. Please log in again.';
    throw ApiError.unauthorized(message);
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('The account for this session no longer exists.');

  req.user = user;
  return next();
});

/** Restricts a route to the given roles. Must run after `protect`. */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          req.user.role === ROLES.CITIZEN
            ? 'Administrator access is required for this action.'
            : `This action requires one of these roles: ${roles.join(', ')}`
        )
      );
    }
    return next();
  };

export const adminOnly = authorize(ROLES.ADMIN);
export const citizenOnly = authorize(ROLES.CITIZEN);

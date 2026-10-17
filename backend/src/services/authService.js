import ApiError from '../utils/ApiError.js';
import User from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

/**
 * Creates a citizen account. Self-registration can NEVER create an
 * administrator - admins are provisioned by the seed script only.
 */
export async function registerCitizen({ name, email, password }) {
  const normalisedEmail = String(email).trim().toLowerCase();

  const existing = await User.findOne({ email: normalisedEmail });
  if (existing) {
    throw ApiError.conflict('An account with this email address already exists.');
  }

  const user = await User.create({
    name: String(name).trim(),
    email: normalisedEmail,
    password,
    role: ROLES.CITIZEN,
  });

  return {
    user: user.toJSON(),
    token: signToken(user),
  };
}

/** Verifies credentials and returns a signed token. */
export async function loginUser({ email, password }) {
  const normalisedEmail = String(email).trim().toLowerCase();

  // `password` is `select: false` on the schema, so request it explicitly.
  const user = await User.findOne({ email: normalisedEmail }).select('+password');

  if (!user) {
    // Same message for unknown email and wrong password: no account enumeration.
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const matches = await user.comparePassword(password);
  if (!matches) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  return {
    user: user.toJSON(),
    token: signToken(user),
  };
}

export async function getUserById(id) {
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User account not found.');
  return user;
}

/**
 * Idempotently creates or updates the administrator account.
 * Used by the seed script and by SEED_ADMIN_ON_START in Docker.
 */
export async function ensureAdmin({ name, email, password }) {
  const normalisedEmail = String(email).trim().toLowerCase();
  let user = await User.findOne({ email: normalisedEmail }).select('+password');

  if (!user) {
    user = await User.create({ name, email: normalisedEmail, password, role: ROLES.ADMIN });
    return { user, created: true };
  }

  user.name = name || user.name;
  user.role = ROLES.ADMIN;
  if (password) user.password = password; // re-hashed by the pre-save hook
  await user.save({ validateBeforeSave: false });

  return { user, created: false };
}

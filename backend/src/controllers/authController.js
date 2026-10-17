import asyncHandler from '../utils/asyncHandler.js';
import * as authService from '../services/authService.js';

/** POST /api/auth/register - citizen self-registration. */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const { user, token } = await authService.registerCitizen({ name, email, password });

  res.status(201).json({
    success: true,
    message: 'Account created successfully. Welcome to CivicFix AI!',
    data: { user, token },
  });
});

/** POST /api/auth/login - citizens and administrators. */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.loginUser({ email, password });

  res.status(200).json({
    success: true,
    message: `Welcome back, ${user.name.split(' ')[0]}!`,
    data: { user, token },
  });
});

/** GET /api/auth/me - returns the authenticated user (session bootstrap). */
export const me = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user.toJSON() },
  });
});

import request from 'supertest';
import app from '../src/app.js';
import { ensureAdmin } from '../src/services/authService.js';

export const api = request(app);

let counter = 0;
const uniqueEmail = (prefix) => `${prefix}${Date.now()}.${counter++}.${Math.random().toString(16).slice(2, 8)}@civicfix.test`;

export const CITIZEN_PASSWORD = 'Passw0rd123';

/** Registers a fresh citizen through the public API. */
export async function registerCitizen(overrides = {}) {
  const payload = {
    name: 'Test Citizen',
    email: uniqueEmail('citizen'),
    password: CITIZEN_PASSWORD,
    ...overrides,
  };

  const response = await api.post('/api/auth/register').send(payload);
  return {
    payload,
    response,
    token: response.body?.data?.token,
    user: response.body?.data?.user,
  };
}

/** Creates an admin directly through the service (admins cannot self-register). */
export async function createAdmin(overrides = {}) {
  const email = overrides.email || uniqueEmail('admin');
  const password = overrides.password || 'AdminPassw0rd123';

  const { user } = await ensureAdmin({
    name: overrides.name || 'Test Administrator',
    email,
    password,
  });

  const response = await api.post('/api/auth/login').send({ email, password });
  return { user, password, email, response, token: response.body?.data?.token };
}

/** Creates a complaint for a given citizen token. */
export async function createComplaint(token, overrides = {}) {
  const payload = {
    category: 'Pothole',
    description: 'A deep pothole is damaging vehicles on this stretch of road.',
    location: 'Main Street, near the central bus stand',
    ...overrides,
  };
  const response = await api.post('/api/complaints').set('Authorization', `Bearer ${token}`).send(payload);
  return { payload, response, complaint: response.body?.data?.complaint };
}

export const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

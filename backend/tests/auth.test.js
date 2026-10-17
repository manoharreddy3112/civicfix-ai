import { describe, expect, it } from 'vitest';
import { api, authHeader, CITIZEN_PASSWORD, registerCitizen } from './helpers.js';
import User from '../src/models/User.js';

describe('Authentication', () => {
  it('registers a citizen and returns a JWT + safe user object', async () => {
    const { response, payload } = await registerCitizen({ name: 'Asha Rao' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeTypeOf('string');
    expect(response.body.data.user.email).toBe(payload.email.toLowerCase());
    expect(response.body.data.user.role).toBe('citizen');
    // The password must never leave the server.
    expect(response.body.data.user.password).toBeUndefined();
  });

  it('stores the password as a bcrypt hash, never as plain text', async () => {
    const { payload } = await registerCitizen();

    const stored = await User.findOne({ email: payload.email.toLowerCase() }).select('+password');
    expect(stored).toBeTruthy();
    expect(stored.password).not.toBe(CITIZEN_PASSWORD);
    expect(stored.password.startsWith('$2')).toBe(true);

    // And the hash genuinely verifies against the original password.
    expect(await stored.comparePassword(CITIZEN_PASSWORD)).toBe(true);
    expect(await stored.comparePassword('wrong-password')).toBe(false);
  });

  it('rejects a duplicate email address with 409', async () => {
    const { payload } = await registerCitizen();

    const duplicate = await api.post('/api/auth/register').send({
      name: 'Someone Else',
      email: payload.email.toUpperCase(), // normalisation must catch this
      password: CITIZEN_PASSWORD,
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.success).toBe(false);
  });

  it('validates the registration payload', async () => {
    const response = await api.post('/api/auth/register').send({
      name: 'A',
      email: 'not-an-email',
      password: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeInstanceOf(Array);
    const fields = response.body.errors.map((error) => error.field);
    expect(fields).toContain('email');
    expect(fields).toContain('password');
  });

  it('cannot be used to self-register an administrator (role escalation blocked)', async () => {
    const { response } = await registerCitizen({ role: 'admin', name: 'Sneaky User' });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe('citizen');

    // Even the admin-only area stays closed.
    const adminCall = await api.get('/api/admin/complaints').set(authHeader(response.body.data.token));
    expect(adminCall.status).toBe(403);
  });

  it('logs in with valid credentials', async () => {
    const { payload } = await registerCitizen();

    const response = await api.post('/api/auth/login').send({
      email: payload.email,
      password: payload.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeTypeOf('string');
  });

  it('rejects a wrong password and an unknown email with the same 401', async () => {
    const { payload } = await registerCitizen();

    const wrongPassword = await api.post('/api/auth/login').send({
      email: payload.email,
      password: 'TotallyWrong123',
    });
    const unknownEmail = await api.post('/api/auth/login').send({
      email: 'nobody@nowhere.test',
      password: CITIZEN_PASSWORD,
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    // Identical message: no account enumeration.
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('returns the current user for a valid token', async () => {
    const { token, payload } = await registerCitizen();

    const response = await api.get('/api/auth/me').set(authHeader(token));
    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(payload.email.toLowerCase());
  });

  it('protects routes with no / malformed / invalid token', async () => {
    const noToken = await api.get('/api/auth/me');
    const malformed = await api.get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt');
    const wrongScheme = await api.get('/api/auth/me').set('Authorization', 'Token abc');

    expect(noToken.status).toBe(401);
    expect(malformed.status).toBe(401);
    expect(wrongScheme.status).toBe(401);
  });
});

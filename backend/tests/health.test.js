import { describe, expect, it } from 'vitest';
import { api } from './helpers.js';

describe('Health and infrastructure', () => {
  it('exposes a health endpoint without leaking secrets', async () => {
    const response = await api.get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.database).toBe('connected');
    expect(response.body.data.ai.mode).toBeTypeOf('string');
    expect(response.body.data.categories.length).toBeGreaterThan(0);

    // The API key must never appear anywhere in the response.
    expect(JSON.stringify(response.body).toLowerCase()).not.toContain('sk-');
  });

  it('returns a structured 404 for unknown routes', async () => {
    const response = await api.get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Route not found');
  });
});

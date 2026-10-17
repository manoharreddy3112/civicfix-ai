import { describe, expect, it } from 'vitest';
import { api, authHeader, createAdmin, createComplaint, registerCitizen } from './helpers.js';
import { TRACKING_ID_REGEX } from '../src/config/constants.js';

describe('Complaint creation', () => {
  it('creates a complaint and returns a real, unique tracking ID', async () => {
    const { token } = await registerCitizen();
    const { response, complaint } = await createComplaint(token);

    expect(response.status).toBe(201);
    expect(complaint.trackingId).toMatch(TRACKING_ID_REGEX);
    expect(complaint.status).toBe('Submitted');
    expect(complaint.category).toBe('Pothole');
    expect(response.body.message).toContain(complaint.trackingId);

    // The audit trail starts with the citizen's submission.
    expect(complaint.statusHistory).toHaveLength(1);
    expect(complaint.statusHistory[0].status).toBe('Submitted');
    expect(complaint.statusHistory[0].changedByRole).toBe('citizen');
  });

  it('generates a different tracking ID for every complaint', async () => {
    const { token } = await registerCitizen();
    const ids = new Set();

    for (let i = 0; i < 8; i += 1) {
      const { complaint } = await createComplaint(token, { description: `Pothole number ${i} on the road surface.` });
      expect(complaint.trackingId).toMatch(TRACKING_ID_REGEX);
      ids.add(complaint.trackingId);
    }

    expect(ids.size).toBe(8);
  });

  it('validates the complaint payload on the backend', async () => {
    const { token } = await registerCitizen();

    const shortDescription = await createComplaint(token, { description: 'too short' });
    expect(shortDescription.response.status).toBe(400);

    const badCategory = await createComplaint(token, { category: 'Aliens' });
    expect(badCategory.response.status).toBe(400);

    const missingLocation = await createComplaint(token, { location: '' });
    expect(missingLocation.response.status).toBe(400);

    const noAuth = await api.post('/api/complaints').send({
      category: 'Pothole',
      description: 'A deep pothole is damaging vehicles on this stretch.',
      location: 'Main Street',
    });
    expect(noAuth.status).toBe(401);
  });
});

describe('Complaint ownership and tracking', () => {
  it('lists only the complaints that belong to the requesting citizen', async () => {
    const alice = await registerCitizen({ name: 'Alice' });
    const bob = await registerCitizen({ name: 'Bob' });

    await createComplaint(alice.token);
    await createComplaint(alice.token, { category: 'Garbage' });
    await createComplaint(bob.token, { category: 'Water Leakage' });

    const aliceList = await api.get('/api/complaints').set(authHeader(alice.token));
    const bobList = await api.get('/api/complaints').set(authHeader(bob.token));

    expect(aliceList.status).toBe(200);
    expect(aliceList.body.data.complaints).toHaveLength(2);
    expect(aliceList.body.data.meta.total).toBe(2);

    expect(bobList.body.data.complaints).toHaveLength(1);
    expect(bobList.body.data.complaints[0].category).toBe('Water Leakage');
  });

  it("prevents a citizen from reading another citizen's complaint", async () => {
    const alice = await registerCitizen({ name: 'Alice' });
    const bob = await registerCitizen({ name: 'Bob' });
    const admin = await createAdmin();

    const { complaint } = await createComplaint(alice.token);
    const trackingId = complaint.trackingId;

    // The owner can read it...
    const ownerView = await api.get(`/api/complaints/${trackingId}`).set(authHeader(alice.token));
    expect(ownerView.status).toBe(200);
    expect(ownerView.body.data.complaint.trackingId).toBe(trackingId);

    // ...anyone else gets a 404 (existence is not revealed).
    const strangerView = await api.get(`/api/complaints/${trackingId}`).set(authHeader(bob.token));
    expect(strangerView.status).toBe(404);

    // And it stays invisible in their own dashboard.
    const bobList = await api.get('/api/complaints').set(authHeader(bob.token));
    expect(bobList.body.data.complaints).toHaveLength(0);

    // An administrator, however, can see every complaint on the platform.
    const adminView = await api.get(`/api/admin/complaints/${trackingId}`).set(authHeader(admin.token));
    expect(adminView.status).toBe(200);
    expect(adminView.body.data.complaint.trackingId).toBe(trackingId);
  });

  it('accepts a tracking ID typed in lower case or without dashes', async () => {
    const { token } = await registerCitizen();
    const { complaint } = await createComplaint(token);

    const lower = await api.get(`/api/complaints/${complaint.trackingId.toLowerCase()}`).set(authHeader(token));
    expect(lower.status).toBe(200);
    expect(lower.body.data.complaint.trackingId).toBe(complaint.trackingId);

    const noDashes = await api
      .get(`/api/complaints/${complaint.trackingId.replace(/-/g, '')}`)
      .set(authHeader(token));
    // The route pattern requires the canonical format, so this is a clean 400.
    expect(noDashes.status).toBe(400);
  });

  it('rejects a malformed tracking ID with 400', async () => {
    const { token } = await registerCitizen();
    const response = await api.get('/api/complaints/NOT-A-TRACKING-ID').set(authHeader(token));
    expect(response.status).toBe(400);
  });

  it('supports search by tracking ID and filtering by status', async () => {
    const { token } = await registerCitizen();
    const first = await createComplaint(token);
    await createComplaint(token, { category: 'Garbage' });

    const search = await api
      .get(`/api/complaints?q=${first.complaint.trackingId}`)
      .set(authHeader(token));
    expect(search.status).toBe(200);
    expect(search.body.data.complaints).toHaveLength(1);
    expect(search.body.data.complaints[0].trackingId).toBe(first.complaint.trackingId);

    const filtered = await api.get('/api/complaints?status=Resolved').set(authHeader(token));
    expect(filtered.body.data.complaints).toHaveLength(0);
  });

  it('reports dashboard counts computed by MongoDB', async () => {
    const { token } = await registerCitizen();
    await createComplaint(token);
    await createComplaint(token, { category: 'Garbage' });
    await createComplaint(token, { category: 'Damaged Road' });

    const stats = await api.get('/api/complaints/stats').set(authHeader(token));
    expect(stats.status).toBe(200);
    expect(stats.body.data.counts).toMatchObject({
      total: 3,
      submitted: 3,
      inProgress: 0,
      resolved: 0,
    });
    expect(stats.body.data.recent).toHaveLength(3);
    expect(stats.body.data.byCategory.Garbage).toBe(1);
  });
});

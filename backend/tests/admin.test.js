import { describe, expect, it } from 'vitest';
import { api, authHeader, createAdmin, createComplaint, registerCitizen } from './helpers.js';

describe('Administrator access control', () => {
  it('blocks citizens from every admin endpoint with 403', async () => {
    const { token } = await registerCitizen();
    const { complaint } = await createComplaint(token);

    const calls = [
      api.get('/api/admin/complaints').set(authHeader(token)),
      api.get('/api/admin/stats').set(authHeader(token)),
      api.get(`/api/admin/complaints/${complaint.trackingId}`).set(authHeader(token)),
      api.patch(`/api/admin/complaints/${complaint.trackingId}/status`).set(authHeader(token)).send({ status: 'Resolved' }),
    ];

    for (const response of await Promise.all(calls)) {
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    }
  });

  it('blocks unauthenticated access to admin endpoints with 401', async () => {
    const response = await api.get('/api/admin/complaints');
    expect(response.status).toBe(401);
  });

  it('blocks citizens from the citizen-only complaint routes', async () => {
    const admin = await createAdmin();
    const response = await api.get('/api/complaints').set(authHeader(admin.token));
    expect(response.status).toBe(403);
  });
});

describe('Administrator complaint management', () => {
  it('lists complaints from every citizen', async () => {
    const alice = await registerCitizen({ name: 'Alice' });
    const bob = await registerCitizen({ name: 'Bob' });
    const admin = await createAdmin();

    await createComplaint(alice.token);
    await createComplaint(bob.token, { category: 'Garbage' });
    await createComplaint(bob.token, { category: 'Broken Streetlight' });

    const response = await api.get('/api/admin/complaints').set(authHeader(admin.token));

    expect(response.status).toBe(200);
    expect(response.body.data.complaints).toHaveLength(3);
    expect(response.body.data.meta.total).toBe(3);
    // Citizen details are populated for the admin table.
    expect(response.body.data.complaints[0].citizen).toHaveProperty('email');
    expect(response.body.data.complaints[0].citizen.password).toBeUndefined();
  });

  it('filters by status and category and searches by tracking ID', async () => {
    const alice = await registerCitizen();
    const admin = await createAdmin();

    const pothole = await createComplaint(alice.token);
    await createComplaint(alice.token, { category: 'Garbage' });
    await api
      .patch(`/api/admin/complaints/${pothole.complaint.trackingId}/status`)
      .set(authHeader(admin.token))
      .send({ status: 'Resolved', note: 'Filled and levelled by the road crew.' });

    const resolved = await api.get('/api/admin/complaints?status=Resolved').set(authHeader(admin.token));
    expect(resolved.body.data.complaints).toHaveLength(1);
    expect(resolved.body.data.complaints[0].trackingId).toBe(pothole.complaint.trackingId);

    const submitted = await api.get('/api/admin/complaints?status=Submitted').set(authHeader(admin.token));
    expect(submitted.body.data.complaints).toHaveLength(1);

    const garbage = await api.get('/api/admin/complaints?category=Garbage').set(authHeader(admin.token));
    expect(garbage.body.data.complaints).toHaveLength(1);
    expect(garbage.body.data.complaints[0].category).toBe('Garbage');

    const search = await api
      .get(`/api/admin/complaints?q=${pothole.complaint.trackingId}`)
      .set(authHeader(admin.token));
    expect(search.body.data.complaints).toHaveLength(1);
  });

  it('updates the status and records the administrator + timestamp in the history', async () => {
    const alice = await registerCitizen();
    const admin = await createAdmin({ name: 'Priya Supervisor' });

    const { complaint } = await createComplaint(alice.token);

    const response = await api
      .patch(`/api/admin/complaints/${complaint.trackingId}/status`)
      .set(authHeader(admin.token))
      .send({ status: 'In Progress', note: 'Crew assigned, scheduled for Friday.' });

    expect(response.status).toBe(200);
    const updated = response.body.data.complaint;

    expect(updated.status).toBe('In Progress');
    expect(updated.statusHistory).toHaveLength(2);

    const change = updated.statusHistory[1];
    expect(change.status).toBe('In Progress');
    expect(change.note).toBe('Crew assigned, scheduled for Friday.');
    expect(change.changedByName).toBe('Priya Supervisor');
    expect(change.changedByRole).toBe('admin');
    expect(change.changedBy).toBe(admin.user._id.toString());
    expect(new Date(change.changedAt).getTime()).not.toBeNaN();

    // A second transition to Resolved appends rather than replaces.
    const resolved = await api
      .patch(`/api/admin/complaints/${complaint.trackingId}/status`)
      .set(authHeader(admin.token))
      .send({ status: 'Resolved', note: 'Repair completed and verified.' });

    expect(resolved.body.data.complaint.status).toBe('Resolved');
    expect(resolved.body.data.complaint.statusHistory).toHaveLength(3);
    expect(resolved.body.data.complaint.resolvedAt).toBeTruthy();
  });

  it('is visible to the citizen as soon as the administrator updates it', async () => {
    const alice = await registerCitizen();
    const admin = await createAdmin();
    const { complaint } = await createComplaint(alice.token);

    await api
      .patch(`/api/admin/complaints/${complaint.trackingId}/status`)
      .set(authHeader(admin.token))
      .send({ status: 'In Progress', note: 'Inspection done.' });

    const citizenView = await api.get(`/api/complaints/${complaint.trackingId}`).set(authHeader(alice.token));

    expect(citizenView.status).toBe(200);
    expect(citizenView.body.data.complaint.status).toBe('In Progress');
    expect(citizenView.body.data.complaint.statusHistory).toHaveLength(2);
  });

  it('rejects invalid statuses and no-op updates', async () => {
    const alice = await registerCitizen();
    const admin = await createAdmin();
    const { complaint } = await createComplaint(alice.token);
    const url = `/api/admin/complaints/${complaint.trackingId}/status`;

    const invalid = await api.patch(url).set(authHeader(admin.token)).send({ status: 'Cancelled' });
    expect(invalid.status).toBe(400);

    const sameStatus = await api.patch(url).set(authHeader(admin.token)).send({ status: 'Submitted' });
    expect(sameStatus.status).toBe(400);
    expect(sameStatus.body.message).toContain('already marked');

    const unknownComplaint = await api
      .patch('/api/admin/complaints/CIV-2026-ZZZZZZ/status')
      .set(authHeader(admin.token))
      .send({ status: 'Resolved', note: 'Nothing here.' });
    expect(unknownComplaint.status).toBe(404);

    const tooLongNote = await api
      .patch(url)
      .set(authHeader(admin.token))
      .send({ status: 'Resolved', note: 'x'.repeat(501) });
    expect(tooLongNote.status).toBe(400);
  });

  it('reports platform-wide summary counts', async () => {
    const alice = await registerCitizen();
    const bob = await registerCitizen();
    const admin = await createAdmin();

    const one = await createComplaint(alice.token);
    await createComplaint(bob.token, { category: 'Garbage' });
    await createComplaint(bob.token, { category: 'Water Leakage' });

    await api
      .patch(`/api/admin/complaints/${one.complaint.trackingId}/status`)
      .set(authHeader(admin.token))
      .send({ status: 'Resolved', note: 'Fixed.' });

    const stats = await api.get('/api/admin/stats').set(authHeader(admin.token));

    expect(stats.status).toBe(200);
    expect(stats.body.data.counts).toMatchObject({ total: 3, submitted: 2, inProgress: 0, resolved: 1 });
    expect(stats.body.data.recent.length).toBeGreaterThan(0);
  });
});

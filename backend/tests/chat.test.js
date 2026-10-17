import { describe, expect, it } from 'vitest';
import { api, authHeader, createAdmin, createComplaint, registerCitizen } from './helpers.js';
import { TRACKING_ID_REGEX } from '../src/config/constants.js';

/**
 * These tests run with OPENAI_API_KEY forced to "" (see tests/setup.js) so the
 * deterministic rule-based engine is exercised - no network, no cost.
 */
const chat = (token, payload) =>
  api.post('/api/chat/message').set(authHeader(token)).send({ message: '', ...payload });

describe('Chatbot - demo mode', () => {
  it('honestly reports that it is in rule-based demo mode', async () => {
    const { token } = await registerCitizen();
    const response = await api.get('/api/chat/mode').set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.data.aiMode).toBe('demo');
    expect(response.body.data.isDemoMode).toBe(true);
    expect(response.body.data.notice).toContain('demo mode');
  });

  it('requires authentication and a non-empty message', async () => {
    const { token } = await registerCitizen();

    const noAuth = await api.post('/api/chat/message').send({ message: 'hello' });
    expect(noAuth.status).toBe(401);

    const empty = await chat(token, { message: '   ' });
    expect(empty.status).toBe(400);
  });

  it('detects the category and asks for the missing location', async () => {
    const { token } = await registerCitizen();

    // Deliberately has no location phrase in it.
    const response = await chat(token, { message: 'I want to report a pothole' });

    expect(response.status).toBe(200);
    const data = response.body.data;
    expect(data.intent).toBe('report');
    expect(data.draft.category).toBe('Pothole');
    expect(data.readyToSubmit).toBe(false);
    expect(data.missingFields).toContain('location');
    // It must ask for the location, not invent one.
    expect(data.reply.toLowerCase()).toContain('where');
  });

  it('collects category, location and description across turns', async () => {
    const { token } = await registerCitizen();

    const first = await chat(token, { message: 'There is a large pothole near the school gate' });
    const draft = first.body.data.draft;
    expect(draft.category).toBe('Pothole');
    expect(draft.location).toBeTruthy();

    const second = await chat(token, {
      message: 'It is very deep and has already damaged two scooters.',
      draft,
    });
    const data = second.body.data;

    expect(data.draft.description.toLowerCase()).toContain('scooter');
    expect(data.readyToSubmit).toBe(true);
    expect(data.missingFields).toHaveLength(0);
  });

  it('walks a citizen from a bare message to a submittable draft', async () => {
    const { token } = await registerCitizen();

    // Turn 1: vague report -> category detected, location missing.
    const turn1 = await chat(token, { message: 'I want to report a water leakage' });
    expect(turn1.body.data.draft.category).toBe('Water Leakage');
    expect(turn1.body.data.readyToSubmit).toBe(false);

    // Turn 2: the answer to "where?" is treated as the location.
    const turn2 = await chat(token, {
      message: 'Sector 12, opposite the community hall',
      draft: turn1.body.data.draft,
    });
    expect(turn2.body.data.draft.location).toContain('Sector 12');

    // Turn 3: description completes the draft.
    const turn3 = await chat(token, {
      message: 'Water has been gushing from a burst pipe since Tuesday morning.',
      draft: turn2.body.data.draft,
    });
    expect(turn3.body.data.readyToSubmit).toBe(true);
  });

  it('marks the reply as degraded rather than failing when the AI is unavailable', async () => {
    const { token } = await registerCitizen();
    const response = await chat(token, { message: 'garbage is piling up near the market' });

    expect(response.status).toBe(200);
    expect(response.body.data.aiMode).toBe('demo');
    expect(response.body.data.demoNotice).toBeTruthy();
  });
});

describe('Chatbot - complaint confirmation and tracking', () => {
  it('creates a real complaint only when the citizen confirms, then tracks it', async () => {
    const { token } = await registerCitizen();

    // 1. Complete a draft through the chat.
    const first = await chat(token, { message: 'There is a broken streetlight near the bus depot' });
    const draft = first.body.data.draft;

    const second = await chat(token, {
      message: 'The whole lane is dark and feels unsafe at night.',
      draft,
    });
    expect(second.body.data.readyToSubmit).toBe(true);

    // 2. Nothing is stored yet - the chatbot itself never writes.
    const beforeConfirm = await api.get('/api/complaints').set(authHeader(token));
    expect(beforeConfirm.body.data.complaints).toHaveLength(0);

    // 3. Explicit confirmation -> POST /api/complaints creates the record.
    const confirmed = await api.post('/api/complaints').set(authHeader(token)).send({
      category: second.body.data.draft.category,
      description: second.body.data.draft.description,
      location: second.body.data.draft.location,
    });

    expect(confirmed.status).toBe(201);
    const trackingId = confirmed.body.data.complaint.trackingId;
    expect(trackingId).toMatch(TRACKING_ID_REGEX);

    // 4. The returned tracking ID is the real one: it resolves via the API.
    const tracked = await api.get(`/api/complaints/${trackingId}`).set(authHeader(token));
    expect(tracked.status).toBe(200);
    expect(tracked.body.data.complaint.category).toBe('Broken Streetlight');

    // 5. ...and via the chatbot, which must echo the live database status.
    const status = await chat(token, { message: `What is the status of ${trackingId}?` });
    expect(status.body.data.intent).toBe('track');
    expect(status.body.data.complaint).toBeTruthy();
    expect(status.body.data.complaint.trackingId).toBe(trackingId);
    expect(status.body.data.complaint.status).toBe('Submitted');
    expect(status.body.data.reply).toContain(trackingId);
  });

  it('never invents a record for an unknown tracking ID', async () => {
    const { token } = await registerCitizen();

    const response = await chat(token, { message: 'Can you check the status of CIV-2026-ZZZZZZ?' });
    const data = response.body.data;

    expect(data.intent).toBe('track');
    expect(data.complaint).toBeNull();
    expect(data.reply.toLowerCase()).toContain('could not find');
  });

  it("will not leak another citizen's complaint through the chatbot", async () => {
    const alice = await registerCitizen({ name: 'Alice' });
    const bob = await registerCitizen({ name: 'Bob' });
    const { complaint } = await createComplaint(alice.token);

    const response = await chat(bob.token, { message: `status of ${complaint.trackingId}` });

    expect(response.body.data.complaint).toBeNull();
    expect(response.body.data.reply.toLowerCase()).toContain('could not find');
  });

  it('lets an administrator look up any complaint by tracking ID', async () => {
    const alice = await registerCitizen();
    const admin = await createAdmin();
    const { complaint } = await createComplaint(alice.token);

    const response = await chat(admin.token, { message: `track ${complaint.trackingId}` });

    expect(response.body.data.complaint).toBeTruthy();
    expect(response.body.data.complaint.trackingId).toBe(complaint.trackingId);
  });

  it('reflects an administrator status update in the chatbot reply', async () => {
    const alice = await registerCitizen();
    const admin = await createAdmin();
    const { complaint } = await createComplaint(alice.token);

    await api
      .patch(`/api/admin/complaints/${complaint.trackingId}/status`)
      .set(authHeader(admin.token))
      .send({ status: 'In Progress', note: 'Team dispatched this morning.' });

    const response = await chat(alice.token, { message: `any update on ${complaint.trackingId}?` });

    expect(response.body.data.complaint.status).toBe('In Progress');
    expect(response.body.data.reply).toContain('In Progress');
    expect(response.body.data.reply).toContain('Team dispatched this morning.');
  });
});

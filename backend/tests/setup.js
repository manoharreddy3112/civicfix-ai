/**
 * Per-worker test setup: connects Mongoose to the shared in-memory MongoDB
 * started by tests/globalSetup.js and wipes collections between tests.
 *
 * IMPORTANT: this file must NOT import src/config/env.js. Setup files run
 * before the test files, so importing the app config here would freeze the
 * environment before the overrides below are applied.
 */

process.env.NODE_ENV = 'test';
// Guarantees the rule-based demo engine is used: chat tests must never call
// (and pay for) the real OpenAI API.
process.env.OPENAI_API_KEY = '';

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

// Fallback instance, used only if the global setup URI was not propagated.
let fallbackServer;

const resolveUri = async () => {
  if (process.env.MONGO_URI_TEST) return process.env.MONGO_URI_TEST;
  fallbackServer = await MongoMemoryServer.create({
    instance: { dbName: 'civicfix_test', launchTimeout: 180_000 },
  });
  return fallbackServer.getUri();
};

beforeAll(async () => {
  const uri = await resolveUri();
  await mongoose.connect(uri, { dbName: 'civicfix_test' });
}, 180_000);

afterEach(async () => {
  // Full isolation between tests: wipe every collection.
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  // Only ever stop an instance this worker created itself.
  await fallbackServer?.stop();
});

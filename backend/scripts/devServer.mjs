#!/usr/bin/env node
/**
 * ============================================================================
 * Local development server with a ZERO-SETUP in-memory MongoDB.
 * ============================================================================
 *
 *   npm run dev:mem
 *
 * Starts a real mongod process in a temporary directory, points the API at it,
 * seeds the administrator account and boots the normal Express server.
 *
 * Why this exists: so you can run and demo the whole application without
 * installing MongoDB or signing up for a cloud cluster.
 *
 * Limitations (read these):
 *   - The database lives in a temporary folder and is DELETED when you stop
 *     this process. Restarting gives you a clean, empty database.
 *   - It needs the `mongodb-memory-server` devDependency, so it is a
 *     development-only tool. It is excluded from the Docker image.
 *
 * For persistent data, set MONGODB_URI in backend/.env instead (MongoDB Atlas
 * or a local MongoDB install) and use `npm run dev`.
 */

import { MongoMemoryServer } from 'mongodb-memory-server';

const DB_NAME = process.env.DEV_DB_NAME || 'civicfix_dev';

console.log('\n[dev:mem] Starting an in-memory MongoDB (nothing to install)...');

let mongo;

try {
  mongo = await MongoMemoryServer.create({
    instance: {
      dbName: DB_NAME,
      // Cold start on Windows can be slow (unpack + antivirus scan).
      launchTimeout: 180_000,
    },
  });
} catch (error) {
  console.error(`\n[dev:mem] Could not start the in-memory MongoDB: ${error.message}`);
  console.error('[dev:mem] Tip: set MONGODB_URI in backend/.env and use `npm run dev` instead.\n');
  process.exit(1);
}

// These MUST be set before ../src/config/env.js is evaluated, which is why the
// server is loaded with a dynamic import further down.
process.env.MONGODB_URI = mongo.getUri(DB_NAME);
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.SEED_ADMIN_ON_START = 'true';

console.log(`[dev:mem] MongoDB is up at ${process.env.MONGODB_URI}`);
console.log('[dev:mem] Data lives in RAM only - stopping this process wipes it.');
console.log('[dev:mem] For persistence, use MongoDB Atlas or a local install in backend/.env.\n');

// Boot the real server (it reads the environment we just populated).
await import('../src/server.js');

let stopping = false;
const shutdown = async (signal) => {
  if (stopping) return;
  stopping = true;
  console.log(`\n[dev:mem] ${signal} received - shutting down the in-memory MongoDB...`);
  await mongo?.stop().catch(() => {});
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

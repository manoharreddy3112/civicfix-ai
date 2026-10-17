/**
 * Vitest global setup - runs ONCE in the main process, before any test file.
 *
 * A single in-memory MongoDB instance is shared by every test file. Starting
 * it here (with a generous launch timeout) avoids the cold-start race that
 * makes mongodb-memory-server flaky on a slow first run.
 */

import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export async function setup() {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'civicfix_test',
      // Cold start (binary unpack + antivirus scan) can take a while on Windows.
      launchTimeout: 180_000,
    },
  });

  // Inherited by the worker processes that run the test files.
  process.env.MONGO_URI_TEST = mongoServer.getUri();

  // eslint-disable-next-line no-console
  console.log(`\n[test] In-memory MongoDB ready at ${mongoServer.getUri()}\n`);
}

export async function teardown() {
  await mongoServer?.stop();
}

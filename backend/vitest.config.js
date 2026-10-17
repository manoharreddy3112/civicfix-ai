import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Applied before setup files and test modules are loaded.
    env: {
      NODE_ENV: 'test',
      OPENAI_API_KEY: '',
    },
    // One shared in-memory MongoDB for the whole run.
    globalSetup: ['./tests/globalSetup.js'],
    setupFiles: ['./tests/setup.js'],
    // mongodb-memory-server may need to download a mongod binary on first run.
    testTimeout: 120_000,
    hookTimeout: 180_000,
    // The in-memory MongoDB instance is shared, so run files sequentially.
    fileParallelism: false,
    reporters: ['default'],
  },
});

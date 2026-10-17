import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connect to MongoDB. Retries a few times so the API can survive the
 * "database container is still booting" race in Docker Compose.
 */
export async function connectDatabase(uri = env.mongoUri, { retries = 5, delayMs = 3000 } = {}) {
  mongoose.set('strictQuery', true);

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10_000,
      });
      return mongoose.connection;
    } catch (error) {
      const last = attempt === retries;
      console.error(
        `[db] connection attempt ${attempt}/${retries} failed: ${error.message}${last ? '' : ` - retrying in ${delayMs / 1000}s`}`
      );
      if (last) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export const databaseState = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
};

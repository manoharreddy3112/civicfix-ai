import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { configWarnings, env, isAiConfigured } from './config/env.js';
import { currentAiMode } from './services/aiService.js';
import { ensureAdmin } from './services/authService.js';

async function bootstrap() {
  // Surface configuration problems early and loudly.
  for (const warning of configWarnings()) {
    console.warn(`[config] WARNING: ${warning}`);
  }

  await connectDatabase();

  if (env.seedAdminOnStart) {
    try {
      const { user, created } = await ensureAdmin({
        name: env.adminName,
        email: env.adminEmail,
        password: env.adminPassword,
      });
      console.log(
        `[seed] Administrator ${created ? 'created' : 'updated'}: ${user.email} (password from ADMIN_PASSWORD)`
      );
    } catch (error) {
      console.error('[seed] Failed to seed the administrator account:', error.message);
    }
  }

  const server = app.listen(env.port, () => {
    console.log('');
    console.log('  CivicFix AI API');
    console.log(`  ---------------------------------------------`);
    console.log(`  Environment : ${env.nodeEnv}`);
    console.log(`  Listening   : http://localhost:${env.port}`);
    console.log(`  Health      : http://localhost:${env.port}/api/health`);
    console.log(
      `  AI mode     : ${currentAiMode()}${
        isAiConfigured()
          ? ` (${env.openaiModel}${env.openaiBaseUrl ? ` @ ${env.openaiBaseUrl}` : ''})`
          : ' - rule-based fallback'
      }`
    );
    console.log(`  CORS origin : ${env.corsOrigin}`);
    console.log('  ---------------------------------------------');
    console.log('');
  });

  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received - shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      console.log('[server] Closed. Bye.');
      process.exit(0);
    });

    // Don't hang forever waiting for open connections.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}

bootstrap().catch((error) => {
  console.error('\n[server] Fatal startup error:', error.message);
  if (error.message?.includes('ECONNREFUSED') || error.message?.includes('Server selection')) {
    console.error(
      '[server] Could not reach MongoDB. Check MONGODB_URI, or start the database:\n' +
        '         Docker : docker compose up -d mongo\n' +
        '         Atlas  : set MONGODB_URI to your mongodb+srv:// connection string'
    );
  }
  process.exit(1);
});

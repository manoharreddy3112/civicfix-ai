/**
 * Seed script - creates or updates the administrator account.
 *
 *   npm run seed
 *
 * Reads ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD from the environment
 * (see backend/.env). Safe to run repeatedly; it is idempotent.
 */
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { env } from '../config/env.js';
import { ensureAdmin } from '../services/authService.js';

async function run() {
  try {
    await connectDatabase();

    const { user, created } = await ensureAdmin({
      name: env.adminName,
      email: env.adminEmail,
      password: env.adminPassword,
    });

    console.log('');
    console.log(`  Administrator ${created ? 'created' : 'updated'} successfully.`);
    console.log('  ---------------------------------------------');
    console.log(`  Name  : ${user.name}`);
    console.log(`  Email : ${user.email}`);
    console.log(`  Role  : ${user.role}`);
    console.log(`  Pass  : ${env.adminPassword}   <-- from ADMIN_PASSWORD`);
    console.log('  ---------------------------------------------');
    console.log('  Log in at /login and you will land on /admin.');
    console.log('');

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('\n[seed] Failed:', error.message);
    await disconnectDatabase().catch(() => {});
    process.exit(1);
  }
}

run();

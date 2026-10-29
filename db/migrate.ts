import fs from 'fs';
import path from 'path';
import pool, { withTransaction } from './pool';

async function runMigrations() {
  console.log('----------------------------------------------------');
  console.log('   Studio GFX Photography — Database Migration Runner');
  console.log('----------------------------------------------------');

  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not defined.');
    console.error('Please configure your .env file or environment before running migrations.');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    // 1. Ensure the schema_migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Query already applied migrations
    const { rows: appliedRows } = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations ORDER BY id ASC;'
    );
    const appliedVersions = new Set(appliedRows.map((r) => r.version));

    // 3. Read migration files in db/migrations/
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.error(`Migration directory not found: ${migrationsDir}`);
      process.exit(1);
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort(); // Natural alphabetical sorting ensures 001_, 002_, ..., 011_ order

    console.log(`Found ${migrationFiles.length} migration file(s).`);
    console.log(`Currently applied: ${appliedVersions.size} migration(s).\n`);

    let newlyAppliedCount = 0;

    for (const file of migrationFiles) {
      if (appliedVersions.has(file)) {
        console.log(`  [SKIP] ${file} (already applied)`);
        continue;
      }

      console.log(`  [APPLYING] ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      // Execute each migration inside a dedicated transaction
      await withTransaction(async (txClient) => {
        await txClient.query(sql);
        await txClient.query(
          'INSERT INTO schema_migrations (version) VALUES ($1);',
          [file]
        );
      });

      console.log(`  [SUCCESS]  ${file} applied successfully.`);
      newlyAppliedCount++;
    }

    console.log('\n----------------------------------------------------');
    if (newlyAppliedCount === 0) {
      console.log('Database is already up to date. No new migrations.');
    } else {
      console.log(`Successfully applied ${newlyAppliedCount} new migration(s).`);
    }
    console.log('----------------------------------------------------');
  } catch (error: any) {
    console.error('\n[MIGRATION FAILURE]: A fatal error occurred while applying migrations:');
    console.error(error.message);
    if (error.position) {
      console.error(`SQL Error Position: ${error.position}`);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute migration runner if called directly
if (require.main === module || process.argv[1]?.includes('migrate')) {
  runMigrations();
}

export default runMigrations;


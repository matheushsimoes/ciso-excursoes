#!/usr/bin/env node
/**
 * Applies the versioned SQL migrations in database/migrations, in order.
 *
 * Applied versions are recorded in the schema_migrations table, so each
 * migration runs exactly once per database. Every migration runs inside its
 * own transaction: if it fails, nothing from it is kept and the runner stops.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/migrate.mjs
 *   MIGRATIONS_DIR=/path/to/migrations (optional)
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import pg from 'pg';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir =
  process.env.MIGRATIONS_DIR ??
  path.resolve(scriptDir, '..', '..', 'database', 'migrations');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

async function main() {
  await client.connect();

  const { rows: tracking } = await client.query(
    "SELECT to_regclass('public.schema_migrations') AS name",
  );
  const { rows: existing } = await client.query(
    "SELECT to_regclass('public.person') AS name",
  );

  if (!tracking[0].name && existing[0].name) {
    throw new Error(
      'This database already has tables but no schema_migrations table: it was ' +
        'created without the migration runner. Recreate it with ' +
        'database/scripts/reset-local-db.sh <database-name>.',
    );
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await client.query('SELECT version FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.version));

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    process.stdout.write(`Applying ${file}... `);

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log('done');
      count++;
    } catch (error) {
      await client.query('ROLLBACK');
      console.log('failed');
      throw error;
    }
  }

  console.log(
    count === 0
      ? 'Database is up to date.'
      : `${count} migration(s) applied.`,
  );
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());

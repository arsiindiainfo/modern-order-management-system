import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.test') });

import * as sql from 'mssql';

/**
 * Same idea as create-database.ts, but explicitly loads .env.test instead
 * of .env — the integration-test database is a separate database on the
 * same container, never the dev database seeded with demo data.
 */
async function main(): Promise<void> {
  const databaseName = process.env.DB_NAME ?? '';
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(databaseName)) {
    throw new Error(
      `DB_NAME is not a valid SQL Server identifier: "${databaseName}"`,
    );
  }

  const pool = await new sql.ConnectionPool({
    server: process.env.DB_HOST ?? '',
    port: parseInt(process.env.DB_PORT ?? '1433', 10),
    user: process.env.DB_USERNAME ?? '',
    password: process.env.DB_PASSWORD ?? '',
    database: 'master',
    options: {
      encrypt: true,
      trustServerCertificate:
        process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    },
  }).connect();

  try {
    await pool
      .request()
      .query(
        `IF DB_ID(N'${databaseName}') IS NULL CREATE DATABASE [${databaseName}]`,
      );
    console.log(`Test database "${databaseName}" ready.`);
  } finally {
    await pool.close();
  }
}

main().catch((err: unknown) => {
  console.error('Failed to create test database:', err);
  process.exitCode = 1;
});

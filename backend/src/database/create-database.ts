import 'dotenv/config';
import * as sql from 'mssql';

/**
 * Docker's SQL Server image boots with only system databases — nothing
 * creates the application database on its own. Run once (via `npm run
 * db:create`, or as part of `npm run db:setup`) before migrations.
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
    console.log(`Database "${databaseName}" ready.`);
  } finally {
    await pool.close();
  }
}

main().catch((err: unknown) => {
  console.error('Failed to create database:', err);
  process.exitCode = 1;
});

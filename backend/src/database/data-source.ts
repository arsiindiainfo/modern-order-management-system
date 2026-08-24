import 'dotenv/config';
import 'reflect-metadata';
import * as path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';

export interface DatabaseConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  trustServerCertificate: boolean;
}

/**
 * Pure options builder — reused by NestJS's TypeOrmModule.forRootAsync (fed
 * from validated ConfigService values) and by the standalone DataSource
 * below (fed from process.env for the TypeORM CLI / db:create script).
 *
 * entities: [] and synchronize: false are load-bearing, not defaults left
 * unset — every read/write goes through StoredProcedureRunner, never a
 * TypeORM entity/repository (see src/common/database).
 */
export function buildDataSourceOptions(
  db: DatabaseConnectionConfig,
): DataSourceOptions {
  return {
    type: 'mssql',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    options: {
      encrypt: true,
      trustServerCertificate: db.trustServerCertificate,
    },
    requestTimeout: 30000,
    pool: { max: 10, min: 0 },
    entities: [],
    synchronize: false,
    migrationsRun: false,
    migrationsTableName: 'migrations_history',
    migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
  };
}

/**
 * Standalone DataSource for the TypeORM CLI (`typeorm migration:run -d
 * dist/database/data-source.js`) and for create-database.ts. Never
 * .initialize()'d by the Nest app itself — app.module.ts calls
 * buildDataSourceOptions() directly with ConfigService-sourced values.
 */
const dataSource = new DataSource(
  buildDataSourceOptions({
    host: process.env.DB_HOST ?? '',
    port: parseInt(process.env.DB_PORT ?? '1433', 10),
    username: process.env.DB_USERNAME ?? '',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? '',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  }),
);

export default dataSource;

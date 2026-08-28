import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.test') });

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source';

/**
 * The TypeORM CLI's -d target for running migrations against the
 * integration-test database (`npm run migration:test:run`) — same
 * buildDataSourceOptions() as dev, pointed at .env.test's DB_NAME instead.
 */
const testDataSource = new DataSource(
  buildDataSourceOptions({
    host: process.env.DB_HOST ?? '',
    port: parseInt(process.env.DB_PORT ?? '1433', 10),
    username: process.env.DB_USERNAME ?? '',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? '',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
  }),
);

export default testDataSource;

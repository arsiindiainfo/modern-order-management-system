import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';
import { buildDataSourceOptions } from './data-source';

interface DbSecretJson {
  username: string;
  password: string;
}

interface CustomResourceEvent {
  RequestType: 'Create' | 'Update' | 'Delete';
}

interface CustomResourceResponse {
  PhysicalResourceId: string;
  Data?: Record<string, unknown>;
}

async function resolveDbCredentials(secretArn: string): Promise<DbSecretJson> {
  const client = new SecretsManagerClient({});
  const result = await client.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );
  return JSON.parse(result.SecretString ?? '{}') as DbSecretJson;
}

/**
 * Programmatic equivalent of `npm run migration:run` (which stays as the
 * CLI/local-dev path) — the entrypoint the migration-runner Lambda calls.
 * RDS sits in a private subnet with no NAT/bastion, so GitHub-hosted CI
 * runners can't reach it directly; this VPC-attached Lambda, invoked once
 * per deploy via a CDK custom resource, is what actually applies
 * migrations against the deployed database (see
 * infra/lib/order-management-stack.ts's RunMigrations custom resource).
 */
export async function runMigrations(): Promise<{ migrationsRun: string[] }> {
  const secretArn = process.env.DB_SECRET_ARN;
  if (!secretArn) {
    throw new Error('DB_SECRET_ARN is not set');
  }
  const { username, password } = await resolveDbCredentials(secretArn);

  const dataSource = new DataSource(
    buildDataSourceOptions({
      host: process.env.DB_HOST ?? '',
      port: parseInt(process.env.DB_PORT ?? '1433', 10),
      username,
      password,
      database: process.env.DB_NAME ?? '',
      trustServerCertificate:
        process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    }),
  );

  await dataSource.initialize();
  try {
    const migrations = await dataSource.runMigrations();
    return { migrationsRun: migrations.map((m) => m.name) };
  } finally {
    await dataSource.destroy();
  }
}

/**
 * The CDK custom-resource event handler. Migrations only ever need to
 * run on Create/Update — a stack Delete tearing down the database isn't
 * an occasion to run migrations, so it's a no-op. PhysicalResourceId is
 * a fixed string (not regenerated per call) so CloudFormation never
 * treats this as a resource replacement.
 */
export async function handler(
  event: CustomResourceEvent,
): Promise<CustomResourceResponse> {
  if (event.RequestType === 'Delete') {
    return { PhysicalResourceId: 'order-management-migrations' };
  }

  const result = await runMigrations();
  console.log(
    `Ran ${result.migrationsRun.length} migration(s):`,
    result.migrationsRun,
  );
  return { PhysicalResourceId: 'order-management-migrations', Data: result };
}

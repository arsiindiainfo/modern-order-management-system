import { INestApplication } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import request from 'supertest';

export type TestRole = 'TENANT_ADMIN' | 'MANAGER' | 'STAFF';

export interface TestTenant {
  tenantId: string;
  userId: string;
  email: string;
  password: string;
  role: TestRole;
  /** A ready-to-use bearer token for this user — no separate login call needed at each call site. */
  accessToken: string;
}

let counter = 0;

/**
 * There's no Tenants/Users CRUD API (only SUPER_ADMIN provisioning is
 * documented, never built) — same as demo-catalog.seed.ts, tenant/user
 * creation goes straight through the DataSource, then a real login call
 * gets a real token exactly as a client would.
 */
export async function createTestTenant(
  app: INestApplication,
  role: TestRole = 'TENANT_ADMIN',
): Promise<TestTenant> {
  counter += 1;
  const dataSource = app.get<DataSource>(getDataSourceToken());
  const slug = `e2e-${Date.now()}-${counter}`;
  const email = `${slug}@example.com`;
  const password = 'TestPass123!';

  const [tenant] = await dataSource.query<{ Id: string }[]>(
    `INSERT INTO Tenants (Name, Slug) OUTPUT INSERTED.Id VALUES (@0, @1)`,
    [slug, slug],
  );
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await dataSource.query<{ Id: string }[]>(
    `INSERT INTO Users (TenantId, FullName, Email, PasswordHash, Role) OUTPUT INSERTED.Id VALUES (@0, @1, @2, @3, @4)`,
    [tenant.Id, 'E2E Test User', email, passwordHash, role],
  );

  const loginResponse = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password });

  return {
    tenantId: tenant.Id,
    userId: user.Id,
    email,
    password,
    role,
    accessToken: (loginResponse.body as { data: { accessToken: string } }).data
      .accessToken,
  };
}

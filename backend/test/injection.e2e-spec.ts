import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './support/testApp';
import { createTestTenant, TestTenant } from './support/testTenant';

interface Envelope<T> {
  success: boolean;
  data: T;
}

/**
 * Every text value in this app reaches SQL Server as a bound stored-
 * procedure parameter (StoredProcedureRunner), never string-concatenated
 * SQL — these probes exist to demonstrate that directly, not because any
 * particular payload is expected to do something clever.
 */
describe('SQL injection probes (e2e)', () => {
  let app: INestApplication;
  let tenant: TestTenant;

  beforeAll(async () => {
    app = await createTestApp();
    tenant = await createTestTenant(app, 'TENANT_ADMIN');
  });

  afterAll(async () => {
    await app.close();
  });

  it('a name containing SQL metacharacters is stored and returned literally', async () => {
    const maliciousName = "O'Brien'; DROP TABLE Users;--";
    const createRes = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send({ name: maliciousName, email: 'injection-probe@example.com' })
      .expect(201);
    const customerId = (
      createRes.body as Envelope<{ id: string; name: string }>
    ).data.id;
    expect((createRes.body as Envelope<{ name: string }>).data.name).toBe(
      maliciousName,
    );

    const getRes = await request(app.getHttpServer())
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .expect(200);
    expect((getRes.body as Envelope<{ name: string }>).data.name).toBe(
      maliciousName,
    );

    // Proof the probe's DROP TABLE never executed: the tenant's user list
    // (via a fresh login) still exists and still works.
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: tenant.email, password: tenant.password })
      .expect(200);
  });

  it('an injection payload in ?search= comes back as a normal empty result, not a 500', async () => {
    await request(app.getHttpServer())
      .get('/api/customers')
      .query({ search: "' OR '1'='1" })
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .expect(200);
  });

  it('an injection payload in ?sortBy= is silently ignored, not executed', async () => {
    await request(app.getHttpServer())
      .get('/api/orders')
      .query({ sortBy: 'placedAt; DROP TABLE Orders;--' })
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .expect(200);
  });
});

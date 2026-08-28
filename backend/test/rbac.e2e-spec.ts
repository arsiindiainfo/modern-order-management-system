import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './support/testApp';
import { createTestTenant, TestTenant } from './support/testTenant';

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let staff: TestTenant;
  let manager: TestTenant;

  beforeAll(async () => {
    app = await createTestApp();
    staff = await createTestTenant(app, 'STAFF');
    manager = await createTestTenant(app, 'MANAGER');
  });

  afterAll(async () => {
    await app.close();
  });

  function expectForbidden(promise: request.Test) {
    return promise.expect(403).expect((res) => {
      expect((res.body as { error: { code: string } }).error.code).toBe(
        'FORBIDDEN_ROLE',
      );
    });
  }

  it('STAFF cannot create a customer', () =>
    expectForbidden(
      request(app.getHttpServer())
        .post('/api/customers')
        .set('Authorization', `Bearer ${staff.accessToken}`)
        .send({ name: 'Should Be Denied', email: 'denied@example.com' }),
    ));

  it('STAFF cannot create a product', () =>
    expectForbidden(
      request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${staff.accessToken}`)
        .send({ sku: 'DENIED-SKU', name: 'Should Be Denied', unitPrice: 1 }),
    ));

  it('STAFF cannot create a discount', () =>
    expectForbidden(
      request(app.getHttpServer())
        .post('/api/discounts')
        .set('Authorization', `Bearer ${staff.accessToken}`)
        .send({
          code: 'DENIED10',
          type: 'PERCENT',
          value: 10,
          startsAt: '2026-01-01T00:00:00Z',
          endsAt: '2026-12-31T23:59:59Z',
        }),
    ));

  it('MANAGER (not TENANT_ADMIN) cannot create a discount', () =>
    expectForbidden(
      request(app.getHttpServer())
        .post('/api/discounts')
        .set('Authorization', `Bearer ${manager.accessToken}`)
        .send({
          code: 'DENIED11',
          type: 'PERCENT',
          value: 10,
          startsAt: '2026-01-01T00:00:00Z',
          endsAt: '2026-12-31T23:59:59Z',
        }),
    ));

  it('MANAGER (not TENANT_ADMIN) cannot view the audit log', () =>
    expectForbidden(
      request(app.getHttpServer())
        .get('/api/audit')
        .set('Authorization', `Bearer ${manager.accessToken}`),
    ));

  it('unauthenticated requests are rejected', async () => {
    await request(app.getHttpServer())
      .get('/api/customers')
      .expect(401)
      .expect((res) => {
        expect((res.body as { error: { code: string } }).error.code).toBe(
          'UNAUTHENTICATED',
        );
      });
  });
});

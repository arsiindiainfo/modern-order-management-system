import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './support/testApp';
import { createTestTenant, TestTenant } from './support/testTenant';

interface Envelope<T> {
  success: boolean;
  data: T;
}

describe('Cross-tenant isolation (e2e)', () => {
  let app: INestApplication;
  let tenantA: TestTenant;
  let tenantB: TestTenant;

  beforeAll(async () => {
    app = await createTestApp();
    tenantA = await createTestTenant(app, 'TENANT_ADMIN');
    tenantB = await createTestTenant(app, 'TENANT_ADMIN');
  });

  afterAll(async () => {
    await app.close();
  });

  it("tenant B cannot fetch tenant A's customer (404, not 403)", async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .send({
        name: 'Tenant A Customer',
        email: 'tenant-a-customer@example.com',
      });
    const customerId = (createRes.body as Envelope<{ id: string }>).data.id;

    await request(app.getHttpServer())
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${tenantB.accessToken}`)
      .expect(404)
      .expect((res) => {
        expect((res.body as { error: { code: string } }).error.code).toBe(
          'RESOURCE_NOT_FOUND',
        );
      });
  });

  it("tenant B cannot fetch tenant A's order (404, not 403)", async () => {
    const customerRes = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .send({
        name: 'Tenant A Customer 2',
        email: 'tenant-a-customer-2@example.com',
      });
    const customerId = (customerRes.body as Envelope<{ id: string }>).data.id;

    const productRes = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .send({
        sku: `E2E-XT-${Date.now()}`,
        name: 'Cross-tenant Product',
        unitPrice: 5,
        initialStock: 10,
      });
    const productId = (productRes.body as Envelope<{ id: string }>).data.id;

    const orderRes = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${tenantA.accessToken}`)
      .send({ customerId, lines: [{ productId, quantity: 1 }] });
    const orderId = (orderRes.body as Envelope<{ id: string }>).data.id;

    await request(app.getHttpServer())
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${tenantB.accessToken}`)
      .expect(404);
  });
});

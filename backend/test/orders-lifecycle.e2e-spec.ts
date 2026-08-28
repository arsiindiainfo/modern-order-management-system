import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './support/testApp';
import { createTestTenant, TestTenant } from './support/testTenant';

interface Envelope<T> {
  success: boolean;
  data: T;
}

describe('Orders lifecycle (e2e)', () => {
  let app: INestApplication;
  let tenant: TestTenant;
  let customerId: string;
  let productId: string;

  beforeAll(async () => {
    app = await createTestApp();
    tenant = await createTestTenant(app, 'TENANT_ADMIN');

    const customerRes = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send({ name: 'E2E Customer', email: 'e2e-customer@example.com' });
    customerId = (customerRes.body as Envelope<{ id: string }>).data.id;

    const productRes = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send({
        sku: `E2E-SKU-${Date.now()}`,
        name: 'E2E Product',
        unitPrice: 10,
        initialStock: 100,
      });
    productId = (productRes.body as Envelope<{ id: string }>).data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('create -> pay -> ship, with history reflecting every step', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send({ customerId, lines: [{ productId, quantity: 2 }] })
      .expect(201);

    const order = (
      createRes.body as Envelope<{
        id: string;
        status: string;
        grandTotal: number;
        currency: string;
        version: number;
      }>
    ).data;
    expect(order.status).toBe('PENDING');
    expect(order.grandTotal).toBe(20);

    const paymentRes = await request(app.getHttpServer())
      .post(`/api/orders/${order.id}/payment`)
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send({
        provider: 'STRIPE',
        amount: order.grandTotal,
        currency: order.currency,
        transactionRef: 'pi_e2e_001',
      })
      .expect(201);
    const paymentData = (
      paymentRes.body as Envelope<{
        order: { status: string; version: number };
      }>
    ).data;
    expect(paymentData.order.status).toBe('CONFIRMED');

    const shipRes = await request(app.getHttpServer())
      .post(`/api/orders/${order.id}/ship`)
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send({
        version: paymentData.order.version,
        carrier: 'UPS',
        trackingNumber: '1Z999',
      })
      .expect(201);
    const shipData = (shipRes.body as Envelope<{ order: { status: string } }>)
      .data;
    expect(shipData.order.status).toBe('SHIPPED');

    const historyRes = await request(app.getHttpServer())
      .get(`/api/orders/${order.id}/history`)
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .expect(200);
    const history = (
      historyRes.body as Envelope<
        { fromStatus: string | null; toStatus: string }[]
      >
    ).data;
    expect(history.map((h) => h.toStatus)).toEqual([
      'PENDING',
      'CONFIRMED',
      'SHIPPED',
    ]);
  });

  it('rejects insufficient stock with 409', async () => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send({ customerId, lines: [{ productId, quantity: 100000 }] })
      .expect(409)
      .expect((res) => {
        expect((res.body as { error: { code: string } }).error.code).toBe(
          'INSUFFICIENT_STOCK',
        );
      });
  });

  it('optimistic locking: two concurrent holds on the same order — one wins, one gets 409', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${tenant.accessToken}`)
      .send({ customerId, lines: [{ productId, quantity: 1 }] });
    const order = (createRes.body as Envelope<{ id: string; version: number }>)
      .data;

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/orders/${order.id}/hold`)
        .set('Authorization', `Bearer ${tenant.accessToken}`)
        .send({ version: order.version, reason: 'Race A' }),
      request(app.getHttpServer())
        .post(`/api/orders/${order.id}/hold`)
        .set('Authorization', `Bearer ${tenant.accessToken}`)
        .send({ version: order.version, reason: 'Race B' }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 409]);
    const conflict = first.status === 409 ? first : second;
    expect((conflict.body as { error: { code: string } }).error.code).toBe(
      'ORDER_VERSION_CONFLICT',
    );
  });
});

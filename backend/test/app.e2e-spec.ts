import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './support/testApp';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ success: true, data: { status: 'ok' } });
  });
});

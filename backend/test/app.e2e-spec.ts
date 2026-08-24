import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// AppModule now wires TypeOrmModule.forRootAsync, which connects to a real
// SQL Server on app.init() — this suite needs a live database (`docker
// compose up -d sqlserver && npm run db:setup` from the repo root) and a
// populated backend/.env, so it's skipped in CI until Phase 5 wires up a
// database service for integration tests. Run manually with `npm run
// test:e2e` once the local DB is up (drop the .skip locally to do so).
describe.skip('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ success: true, data: { status: 'ok' } });
  });

  afterEach(async () => {
    await app.close();
  });
});

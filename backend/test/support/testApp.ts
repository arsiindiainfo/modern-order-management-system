import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';

/**
 * Boots the real app (all modules, guards, the global pipe/filter/
 * interceptor) against the integration-test database — every spec file
 * gets its own instance via this helper rather than duplicating the
 * bootstrap dance NestFactory does in main.ts.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  return app;
}

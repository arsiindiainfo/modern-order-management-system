import 'reflect-metadata';
import type { Handler } from 'aws-lambda';
import serverlessExpress from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

interface DbSecretJson {
  username: string;
  password: string;
}

/**
 * infra/lib/order-management-stack.ts sets DB_SECRET_ARN/JWT_SECRET_ARN
 * (never raw credentials) — resolved once per cold start into the same
 * env vars configuration.ts already reads (DB_USERNAME/DB_PASSWORD/
 * JWT_SECRET), so nothing downstream of ConfigModule needs to know it's
 * running in Lambda at all.
 */
async function resolveSecretsIntoEnv(): Promise<void> {
  const client = new SecretsManagerClient({});

  const dbSecretArn = process.env.DB_SECRET_ARN;
  if (dbSecretArn) {
    const result = await client.send(new GetSecretValueCommand({ SecretId: dbSecretArn }));
    const { username, password } = JSON.parse(result.SecretString ?? '{}') as DbSecretJson;
    process.env.DB_USERNAME = username;
    process.env.DB_PASSWORD = password;
  }

  const jwtSecretArn = process.env.JWT_SECRET_ARN;
  if (jwtSecretArn) {
    const result = await client.send(new GetSecretValueCommand({ SecretId: jwtSecretArn }));
    if (result.SecretString) {
      process.env.JWT_SECRET = result.SecretString;
    }
  }
}

/** Same bootstrap as main.ts (helmet, CORS, /api prefix, non-prod Swagger) — just no app.listen(), serverless-express drives requests instead. */
async function bootstrap(): Promise<Handler> {
  await resolveSecretsIntoEnv();

  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  const configService = app.get(ConfigService<AppConfig, true>);

  app.use(helmet());
  app.enableCors();
  app.setGlobalPrefix('api');

  if (configService.get('nodeEnv', { infer: true }) !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Modern Order Management System API')
      .setDescription('Multi-tenant order management API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.init();
  return serverlessExpress({ app: expressApp });
}

let cachedHandler: Handler | undefined;

export const handler: Handler = async (event, context, callback) => {
  cachedHandler ??= await bootstrap();
  return cachedHandler(event, context, callback);
};

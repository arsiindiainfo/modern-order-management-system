# modern-order-management-system
Multi-tenant SaaS Order Management System built with NestJS, React, TypeScript, SQL Server and AWS.

## Local development

```bash
cp .env.example .env               # set MSSQL_SA_PASSWORD
cp backend/.env.example backend/.env

docker compose up -d sqlserver     # local SQL Server, host port 14330
cd backend
npm install
npm run db:setup                   # creates the database, runs migrations + stored procedures
npm run db:seed                    # optional — demo tenant/customers/products/orders/discounts
npm run start:dev                  # http://localhost:3000/api/health, docs at /api/docs
```

```bash
cd frontend
npm install
npm run dev                        # http://localhost:5173
```

Log in with the seeded demo account: `manager@acme-demo.com` / `DemoPass123!`.

Only the `sqlserver` service exists in `docker-compose.yml` — `backend`/`frontend` run directly via `npm`, and `localstack` was never added since nothing in this project uses S3/document upload.

## Running the test suite

Unit tests (mocked repositories, no database) run against `backend/src/**/*.spec.ts` and `frontend/src/**/*.test.tsx`:

```bash
cd backend  && npm test            # npm run test:cov for the coverage report (≥80% on modules/**/*.service.ts)
cd frontend && npm test
```

Integration tests (`backend/test/*.e2e-spec.ts`) exercise the real API — guards, stored procedures, and all — against a **separate** database, never the one seeded with demo data:

```bash
cp backend/.env.test.example backend/.env.test   # same container, DB_NAME=OrderManagementSystemTest
cd backend
npm run db:test:setup              # creates the test database, runs migrations + stored procedures
npm run test:e2e
```

CI (`.github/workflows/ci.yml`) runs both unit and integration suites on every push/PR, spinning up its own `sqlserver` service container.

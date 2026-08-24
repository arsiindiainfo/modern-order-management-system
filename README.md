# modern-order-management-system
Multi-tenant SaaS Order Management System built with NestJS, React, TypeScript, SQL Server and AWS.

## Local development (Phase 0)

```bash
cp .env.example .env               # set MSSQL_SA_PASSWORD
cp backend/.env.example backend/.env

docker compose up -d sqlserver     # local SQL Server, host port 14330
cd backend
npm install
npm run db:setup                   # creates the database, runs migrations + stored procedures
npm run start:dev                  # http://localhost:3000/api/health, docs at /api/docs
```

Only the `sqlserver` service exists in `docker-compose.yml` for now — `backend`/`frontend`/`localstack` services and seed data land in a later hardening phase.

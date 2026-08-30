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

## Deploying to AWS

Infrastructure is defined as code in `infra/` (AWS CDK v2, TypeScript) —
one stack, instantiated once per environment (`staging`/`prod`). It
provisions: a VPC (no NAT Gateway — the Lambda reaches Secrets Manager
via a VPC interface endpoint instead, since RDS access is already
intra-VPC), RDS for SQL Server (`db.t3.micro`, Express edition — the
free-tier-eligible substitute for local dev's Developer edition; every
feature this project uses — tables, stored procedures, functions,
`RAISERROR`, transactions — is identical across editions), the API
packaged as a Lambda container image behind an HTTP API (API Gateway
v2), a private S3 bucket + CloudFront distribution for the frontend SPA
(with a `/api/*` behavior routed to the HTTP API), a private S3 bucket
reserved for future generated documents, a small VPC-attached Lambda
that runs the TypeORM migrations once per deploy (via a CDK custom
resource — GitHub-hosted runners can't reach RDS in a private subnet
directly, so migrations run from inside the VPC instead), and two
CloudWatch alarms (5xx rate, p99 latency) publishing to an SNS topic.

**This repository's environment has no AWS account or credentials
configured, so none of this has actually been deployed.** The code below
is complete and has been validated locally via `cdk synth` and a CDK
assertions test (`infra/lib/order-management-stack.test.ts`) — both run
with no AWS account needed — but deploying for real requires your own
AWS account.

### One-time setup (per AWS account)

```bash
cd infra
npm install
npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-1   # once per account/region
```

For CI/CD (`.github/workflows/deploy.yml`) to deploy on your behalf, create
an IAM role that trusts GitHub's OIDC provider (no long-lived AWS keys are
stored in GitHub Secrets) and store its ARN as the repository secret
`AWS_ROLE_ARN`. The role needs permission to deploy the stack's resources
and to push to the CDK bootstrap ECR repo (`cdk deploy` builds, tags, and
pushes the Lambda container image itself as part of asset publishing).

### Deploying manually

```bash
cd infra
npx cdk diff   -c env=staging     # preview changes
npx cdk deploy -c env=staging     # or -c env=prod
```

### What gets created

| Resource | Purpose |
|---|---|
| VPC (public + isolated subnets, no NAT) | Network isolation for RDS/Lambda |
| RDS SQL Server (`db.t3.micro`, Express) | Application database |
| Secrets Manager (2 secrets) | DB credentials (RDS-generated) + JWT signing secret |
| Lambda (container image) + HTTP API | The NestJS API |
| Lambda (container image) + custom resource | Runs migrations once per deploy |
| S3 (private) + CloudFront (OAC) | Frontend SPA hosting |
| S3 (private) | Reserved for future generated documents (unused today) |
| CloudWatch alarms (2) + SNS topic | 5xx rate and p99 latency alerting |

### Tearing down

```bash
cd infra
npx cdk destroy -c env=staging
```

RDS is **not** deletion-protected in `staging` (it is in `prod`), so
`staging` tears down cleanly; `prod` requires disabling deletion
protection first.

### Cost expectations

RDS, CloudFront, and the always-provisioned Lambda log groups are the
ongoing line items. `db.t3.micro` and Lambda's own compute are
free-tier-eligible for a new AWS account, but RDS storage, CloudFront
data transfer, and Secrets Manager (billed per secret, no free tier) are
**not zero-cost** even at low traffic. Destroy the `staging` stack when
not actively demoing it if cost is a concern.

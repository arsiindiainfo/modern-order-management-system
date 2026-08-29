# Multi-stage build for the Lambda container-image deployment
# (infra/lib/order-management-stack.ts). Both stages use the SAME
# Amazon-Linux-based Lambda Node image — bcrypt has a native (compiled)
# addon, and building it against a different OS/Node-ABI base (e.g. a
# generic node:24-slim build stage) than the Lambda runtime it ends up
# executing in is the classic "invalid ELF header" native-module bug.
# Building here against the exact runtime base avoids that entirely.

FROM public.ecr.aws/lambda/nodejs:22 AS build
WORKDIR /build

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Drop devDependencies from the image that actually ships — smaller,
# and nothing in dist/ needs ts-node/jest/eslint at runtime.
RUN npm prune --omit=dev

FROM public.ecr.aws/lambda/nodejs:22
# dist/'s contents land directly at ${LAMBDA_TASK_ROOT} (not nested
# under a dist/ folder) — CMD overrides in infra/ reference paths
# relative to that flattened root, e.g. "database/run-migrations.handler".
COPY --from=build /build/dist ${LAMBDA_TASK_ROOT}
COPY --from=build /build/node_modules ${LAMBDA_TASK_ROOT}/node_modules

# The default entrypoint is the API handler (backend/src/lambda.ts) —
# infra/'s migration-runner Lambda overrides this CMD to
# ["database/run-migrations.handler"] via the same image.
CMD ["lambda.handler"]

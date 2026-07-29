# Built from the repo root (see infra/lib/app-stack.ts) because the image
# needs the workspace manifests and packages/shared, not just apps/api.

FROM node:24-slim AS build
RUN corepack enable
WORKDIR /repo
# Manifests first so dependency layers survive source-only changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @harbinger/api...
COPY apps/api apps/api
COPY packages/shared packages/shared
# Workspace code (api + shared) is compiled into one file; npm packages are
# left external and resolved from node_modules at runtime, because bundling
# them breaks packages that ship runtime assets (@fastify/swagger-ui).
RUN pnpm --filter @harbinger/api exec esbuild src/server.ts \
    --bundle --platform=node --format=esm --packages=external \
    --alias:@harbinger/shared=/repo/packages/shared/src/index.ts \
    --outfile=dist/server.mjs

FROM node:24-slim AS prod-deps
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --prod --filter @harbinger/api...

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
USER node
EXPOSE 3000
WORKDIR /app/apps/api
CMD ["node", "dist/server.mjs"]

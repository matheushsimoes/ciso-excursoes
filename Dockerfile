# syntax=docker/dockerfile:1

# ---- build: compile TypeScript and keep only production dependencies ----
FROM node:24-alpine AS build
WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# ---- runtime: small image, non-root user ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app/backend

# Same layout as the repository, so the default paths in main.ts and
# scripts/migrate.mjs work unchanged: ../frontend and ../database/migrations.
COPY --from=build --chown=node:node /app/backend/package.json ./
COPY --from=build --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/dist ./dist
COPY --chown=node:node backend/scripts ./scripts
COPY --chown=node:node database/migrations /app/database/migrations
COPY --chown=node:node frontend /app/frontend

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Apply pending migrations, then replace the shell with Node so it receives
# SIGTERM directly and Nest's shutdown hooks close the database pool cleanly.
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node dist/main.js"]

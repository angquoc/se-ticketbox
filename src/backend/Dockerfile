# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# python3 is required by Prisma CLI to generate the client
RUN apk add --no-cache python3 make g++ git

# Copy package files only (enables Docker layer caching)
COPY package.json package-lock.json* ./

# Install all dependencies (including dev, because Prisma generate needs it)
# NOTE: we intentionally run install scripts here — bcrypt uses node-gyp-build
# in its install hook to download prebuilt native binaries.
RUN npm install

# Copy source
COPY . .

# Generate Prisma client (using dummy URL for build time)
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=${DATABASE_URL}
RUN npx prisma generate

# Build NestJS
RUN npm run build

# Prune dev dependencies and keep only production dependencies.
# We back up node_modules/.prisma before pruning because npm prune will remove it.
RUN cp -R node_modules/.prisma /tmp/.prisma && \
    npm prune --omit=dev && \
    cp -R /tmp/.prisma node_modules/.prisma

# ── Stage 2: Production runtime ─────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copy built artifacts and production dependencies
COPY --from=builder --chown=nestjs:nodejs /app/node_modules          ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist                    ./dist
COPY --from=builder --chown=nestjs:nodejs /app/prisma                  ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json            ./
COPY --from=builder --chown=nestjs:nodejs /app/tsconfig.json            ./tsconfig.json
COPY --from=builder --chown=nestjs:nodejs /app/prisma.config.ts        ./prisma.config.ts

USER nestjs

EXPOSE 3001

# HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
#   CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/src/main"]

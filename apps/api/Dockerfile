# ===============================
# Build Stage
# ===============================
# NOTE: Build context should be the repo root, not apps/api
# In EasyPanel: Build Path = /, Dockerfile = apps/api/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies needed for native modules
RUN apk add --no-cache python3 make g++

# Copy workspace config and package files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (including dev for building)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

# Build shared package first
RUN pnpm --filter @ugc/shared build

# Generate Prisma client
RUN cd apps/api && pnpm exec prisma generate

# Build the application
RUN pnpm --filter api build

# ===============================
# Production Stage
# ===============================
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install Chromium for Puppeteer PDF generation
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy workspace config and package files for production install
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install production dependencies only
RUN pnpm install --no-frozen-lockfile --prod

# Copy built shared package
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

# Copy Prisma schema and generate client
COPY apps/api/prisma ./apps/api/prisma
RUN npm install -g prisma && prisma generate --schema=apps/api/prisma/schema.prisma

# Copy built application from builder
COPY --from=builder /app/apps/api/dist ./dist

# Copy entrypoint script
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Create directories Puppeteer needs and set permissions
RUN mkdir -p /home/nestjs/.cache && \
    chown -R nestjs:nodejs /home/nestjs /app

USER nestjs

# Expose API port
EXPOSE 3232

# Default to running the API
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["api"]

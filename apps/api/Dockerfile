# ===============================
# Build Stage
# ===============================
# NOTE: Build context should be the repo root, not apps/api
# In EasyPanel: Build Path = /, Dockerfile = apps/api/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies needed for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# Copy all package files and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

# Install ALL dependencies (including dev, needed for build and prisma)
RUN pnpm install --frozen-lockfile

# Copy Prisma schema first (needed for prisma generate)
COPY apps/api/prisma ./apps/api/prisma

# Generate Prisma client - run from the api workspace directory
WORKDIR /app/apps/api
RUN pnpm exec prisma generate

# Go back to app root
WORKDIR /app

# Copy the rest of the API source code
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig*.json ./apps/api/
COPY apps/api/nest-cli.json ./apps/api/

# Build the application
RUN pnpm --filter api run build

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

# Copy package files for production install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy Prisma schema (needed for migrations at runtime)
COPY apps/api/prisma ./apps/api/prisma

# Copy generated Prisma client from builder
# The generated client lives in node_modules/.prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

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

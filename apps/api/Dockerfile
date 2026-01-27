# ===============================
# Build Stage
# ===============================
# NOTE: Build context should be the repo root, not apps/api
# In EasyPanel: Build Path = /, Dockerfile = apps/api/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies needed for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# Copy all package files and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

# Install ALL dependencies (including dev, needed for build and prisma)
RUN pnpm install --frozen-lockfile

# Copy Prisma schema and config first (needed for prisma generate)
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/prisma.config.ts

# Generate Prisma client from the api workspace directory
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

# Use pnpm deploy to create a production-ready folder
# This resolves all symlinks and copies only production dependencies
RUN pnpm --filter api deploy --legacy --prod /app/deploy

# Copy the generated Prisma client from builder into deploy
# pnpm deploy doesn't copy the generated .prisma files
RUN for src in /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma; do \
      dest="${src/\/app\/node_modules/\/app\/deploy\/node_modules}"; \
      cp -r "$src" "$(dirname "$dest")"; \
    done

# Copy the built dist folder into the deploy directory
RUN cp -r /app/apps/api/dist /app/deploy/dist

# Copy prisma schema and config to deploy (needed for migrations at runtime)
RUN cp -r /app/apps/api/prisma /app/deploy/prisma
RUN cp /app/apps/api/prisma.config.ts /app/deploy/prisma.config.ts

# ===============================
# Production Stage
# ===============================
FROM node:20-alpine AS production

WORKDIR /app

# Install prisma CLI globally for running migrations
RUN npm install -g prisma@7.3.0

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

# Copy the deployed application from builder
# pnpm deploy creates a standalone folder with resolved dependencies
COPY --from=builder /app/deploy ./

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

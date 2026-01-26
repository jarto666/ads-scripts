# ===============================
# Build Stage
# ===============================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install all dependencies (including dev for building)
RUN npm ci

# Copy source code
COPY apps/api ./apps/api
COPY tsconfig.json ./

# Generate Prisma client
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Build the application
RUN npm run build -w apps/api

# ===============================
# Production Stage
# ===============================
FROM node:20-alpine AS production

WORKDIR /app

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
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy Prisma schema (needed for migrations)
COPY apps/api/prisma ./apps/api/prisma

# Generate Prisma client in production image
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma

# Copy built application from builder
COPY --from=builder /app/apps/api/dist ./dist

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
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

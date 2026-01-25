# UGC Script Factory

AI-powered UGC (User Generated Content) script generator for TikTok, Reels, and Shorts. Generate scroll-stopping video scripts complete with hooks, storyboards, and filming instructions.

## Features

- **AI Script Generation** — Generate multiple scripts per angle using Claude AI
- **8 Script Angles** — Pain agitation, objection reversal, transformation, curiosity hook, and more
- **Shot-by-Shot Storyboards** — Detailed filming instructions for each scene
- **Target Personas** — Define audience segments for personalized scripts
- **Quality Tiers** — Standard (Haiku) and Premium (Sonnet) generation
- **Script Scoring** — Automatic quality scoring with warnings for forbidden claims
- **Export Options** — PDF Creator Packs and CSV Producer Sheets
- **Magic Link Auth** — Passwordless authentication via email

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TailwindCSS 4, shadcn/ui |
| State | Jotai (local), React Query (server) |
| API Client | Orval (generated from OpenAPI) |
| Backend | NestJS 11, Prisma ORM |
| Database | PostgreSQL 15 |
| Queue | BullMQ + Redis |
| AI | OpenRouter (Claude Haiku/Sonnet) |
| Storage | Cloudflare R2 (S3-compatible) |

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- OpenRouter API key

## Quick Start

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd ai-ad-scripts
make install

# 2. Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
# Edit .env files with your API keys

# 3. Start all services (Postgres + Redis + API + Web + API watch)
make dev
```

The app will be available at:
- **Web**: http://localhost:3000
- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs

## Available Commands

```bash
make help           # Show all available commands

# Development
make dev            # Start all services (db + redis + api + web + api-watch)
make dev-api        # Start API server only
make dev-web        # Start web server only

# Database
make db-up          # Start Postgres container
make db-down        # Stop containers
make db-push        # Push Prisma schema to database
make db-migrate     # Run Prisma migrations
make db-studio      # Open Prisma Studio

# API Client
make api-generate   # Generate API client from OpenAPI spec

# Build
make build          # Build all packages
make build-api      # Build API only
make build-web      # Build web only

# Cleanup
make clean          # Remove node_modules and build artifacts
```

## Environment Variables

### API (`apps/api/.env`)

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5487/ugc_script_factory"

# Auth
JWT_SECRET="your-jwt-secret-min-32-chars"
WEB_BASE_URL="http://localhost:3000"

# Email (optional - logs to console if not set)
EMAIL_PROVIDER="resend"
EMAIL_FROM="noreply@yourdomain.com"
RESEND_API_KEY="re_xxx"

# OpenRouter (required for generation)
OPENROUTER_API_KEY="sk-or-xxx"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"

# R2 Storage (required for exports)
S3_ENDPOINT="https://xxx.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="exports"
S3_ACCESS_KEY_ID="xxx"
S3_SECRET_ACCESS_KEY="xxx"
S3_PUBLIC_BASE_URL="https://your-public-r2-url.com"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
```

### Web (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Project Structure

```
/apps
  /api                    # NestJS backend
    /prisma               # Database schema & migrations
    /src
      /admin              # Admin dashboard endpoints
      /auth               # Magic link authentication
      /batches            # Batch & script management
      /exports            # PDF/CSV generation, R2 storage
      /generation         # AI script generation
      /personas           # Target persona management
      /projects           # Project CRUD
      /queue              # BullMQ job processing
      /settings           # User settings
    /swagger              # Generated OpenAPI spec

  /web                    # Next.js frontend
    /src
      /api/generated      # Orval-generated API client
      /app                # App router pages
      /components         # UI components
      /lib                # Utilities, hooks, atoms

/packages
  /shared                 # Shared types & schemas
```

## Development Workflow

1. **API changes**: Modify NestJS controllers/services, Swagger decorators auto-update OpenAPI spec
2. **Schema changes**: Edit `prisma/schema.prisma`, run `make db-push`
3. **API client**: Orval watches OpenAPI spec and regenerates client automatically in dev mode

## Documentation

- [Implementation Status](./IMPLEMENTATION_STATUS.md) — Feature completion tracker
- [Roadmap](./ROADMAP.md) — Future features and phases
- [Pricing](./PRICING.md) — Pricing model documentation

## License

Private — All rights reserved

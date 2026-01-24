# UGC Script Factory - Implementation Status

## Progress Tracker

### PR1 — Foundation ✅
- [x] NestJS 11 app scaffold (`/apps/api`)
- [x] Prisma + Postgres connection
- [x] User + MagicLinkToken schema
- [x] Basic auth endpoints with mocked email sender
- [x] Shared package with types/schemas

### PR2 — Web Skeleton ✅
- [x] Next.js 15 app scaffold (`/apps/web`)
- [x] Auth pages (request link + callback)
- [x] Protected routes (dashboard layout)
- [x] Project list + create UI
- [x] Docker Compose + Makefile + VS Code tasks

### PR3 — Project + Persona CRUD ✅
- [x] Project CRUD (API + UI)
- [x] Project detail page with tabs
- [x] Persona CRUD (API + UI)

### PR4 — Generation Engine (OpenRouter) ✅
- [x] OpenRouter client module
- [x] Two-pass generation (plans + scripts)
- [x] JSON parsing with repair fallback
- [x] Batch endpoints + progress status
- [x] Scoring service (heuristic)

### PR5 — UI for Scripts ✅
- [x] Generation page with settings
- [x] Batch results table with filters
- [x] Script detail expansion
- [x] Regenerate with instructions
- [x] Score + warnings display

### PR6 — Exports to R2 ✅
- [x] CSV generation (Producer Sheet)
- [x] PDF generation (Creator Pack with puppeteer)
- [x] R2/S3 storage integration
- [x] Export endpoints + UI buttons

### PR7 — Hardening
- [ ] Rate limits
- [ ] Better validation errors
- [ ] Logging with batch_id, project_id
- [ ] Max limits (scripts per batch, text length)

---

## Quick Start

```bash
# 1. Install dependencies
make install

# 2. Start Postgres (port 5487)
make db-up

# 3. Push database schema
make db-push

# 4. Start development servers
make dev-api   # Terminal 1: API on :3001
make dev-web   # Terminal 2: Web on :3000
```

---

## API Endpoints

### Auth
- `POST /auth/request-link` - Send magic link email
- `POST /auth/consume-link` - Verify token, set JWT cookie
- `POST /auth/logout` - Clear auth cookie
- `GET /auth/me` - Get current user

### Projects
- `GET /projects` - List user's projects
- `POST /projects` - Create project
- `GET /projects/:id` - Get project with personas
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Personas
- `GET /projects/:projectId/personas` - List personas
- `POST /projects/:projectId/personas` - Create persona
- `PUT /personas/:id` - Update persona
- `DELETE /personas/:id` - Delete persona

### Batches & Scripts
- `POST /projects/:projectId/batches` - Start generation
- `GET /projects/:projectId/batches` - List batches
- `GET /batches/:id` - Get batch status
- `GET /batches/:id/scripts` - Get scripts
- `POST /scripts/:id/regenerate` - Regenerate script
- `POST /batches/:id/export` - Export PDF + CSV to R2

---

## Environment Variables

### API (.env)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5487/ugc_script_factory"
JWT_SECRET="your-secret"
WEB_BASE_URL="http://localhost:3000"

# Email (optional - logs to console by default)
EMAIL_PROVIDER="resend"
EMAIL_FROM="noreply@example.com"
RESEND_API_KEY=""

# OpenRouter
OPENROUTER_API_KEY=""
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
OPENROUTER_MODEL="anthropic/claude-3.5-sonnet"

# R2 Storage
S3_ENDPOINT="https://xxx.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="exports"
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_PUBLIC_BASE_URL=""
```

### Web (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Acceptance Checklist

- [x] Magic link login works end-to-end
- [x] Project wizard saves and reloads data
- [x] Generate scripts with concrete storyboard filming instructions
- [x] Forbidden phrases/claims are flagged in warnings
- [x] Regenerate changes tone while respecting constraints
- [x] Exports upload to R2 and download links work
- [ ] App deployable with env vars only (needs testing)

---

## Files Structure

```
/apps
  /api                        - NestJS 11 API
    /prisma/schema.prisma     - Database models
    /src
      /auth                   - Magic link auth
      /batches                - Batch/script endpoints
      /exports                - CSV, PDF, R2 storage
      /generation             - OpenRouter, prompts, scoring
      /personas               - Persona CRUD
      /prisma                 - Prisma service
      /projects               - Project CRUD
  /web                        - Next.js 15 App
    /src
      /app
        /(dashboard)          - Protected routes
          /projects           - Project list
          /projects/[id]      - Project detail
          /projects/[id]/generate - Script generation
        /auth/callback        - Magic link callback
      /components/ui          - shadcn/ui components
      /lib                    - API client, auth, utils

/packages
  /shared                     - Shared types & Zod schemas

docker-compose.yml            - Postgres on port 5487
Makefile                      - Dev commands
.vscode/tasks.json            - VS Code tasks
```

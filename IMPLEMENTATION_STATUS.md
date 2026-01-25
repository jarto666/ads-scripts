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

### PR7 — Admin Dashboard ✅
- [x] Access request management (approve/reject)
- [x] User management (list, create, delete)
- [x] Admin toggle + magic link generation
- [x] Stats overview (users, projects, scripts, requests)
- [x] Admin guard on protected routes

### PR8 — Quality Tiers & Pricing ✅
- [x] User plan field (free/paid)
- [x] Batch quality field (standard/premium)
- [x] Model selection based on quality (Haiku/Sonnet)
- [x] Quality selector UI with pricing display
- [x] Premium quality restricted to paid users
- [x] Admin can update user plans

### PR9 — Settings & Polish ✅
- [x] Settings page with profile management
- [x] Editable name field
- [x] Account deletion with confirmation
- [x] Per-project generation settings (jotai + localStorage)
- [x] Tab query parameter on project page
- [x] Auto-navigate to scripts tab when scripts exist

### PR10 — API Client Generation ✅
- [x] NestJS Swagger setup with OpenAPI spec
- [x] Orval configuration for React Query hooks
- [x] Custom fetch instance with credentials
- [x] Generated typed API client
- [x] Watch mode for auto-regeneration
- [x] Migrated all pages to use generated hooks

### PR11 — Hardening
- [ ] Rate limits
- [ ] Better validation errors
- [ ] Logging with batch_id, project_id
- [ ] Max limits (scripts per batch, text length)
- [ ] Error boundaries in UI

---

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
| Auth | Magic link + JWT cookies |

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
- `PATCH /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Personas
- `POST /projects/:projectId/personas` - Create persona
- `DELETE /personas/:id` - Delete persona

### Batches & Scripts
- `POST /projects/:projectId/batches` - Start generation
- `GET /projects/:projectId/batches` - List batches
- `GET /batches/:id` - Get batch status
- `GET /batches/:id/scripts` - Get scripts
- `POST /batches/:scriptId/regenerate` - Regenerate script
- `GET /exports/:batchId` - Export PDF + CSV to R2

### Settings
- `GET /settings/profile` - Get user profile
- `PATCH /settings/profile` - Update profile (name)
- `DELETE /settings/account` - Delete account

### Admin
- `GET /admin/stats` - Dashboard statistics
- `GET /admin/requests` - List access requests
- `POST /admin/requests/:id/approve` - Approve request
- `POST /admin/requests/:id/reject` - Reject request
- `DELETE /admin/requests/:id` - Delete request
- `GET /admin/users` - List all users
- `POST /admin/users` - Create user
- `DELETE /admin/users/:id` - Delete user
- `POST /admin/users/:id/toggle-admin` - Toggle admin status
- `PATCH /admin/users/:id/plan` - Update user plan
- `POST /admin/users/:id/magic-link` - Generate magic link

---

## Environment Variables

### API (`apps/api/.env`)
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

# R2 Storage
S3_ENDPOINT="https://xxx.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET="exports"
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_PUBLIC_BASE_URL=""

# Redis (for BullMQ)
REDIS_HOST="localhost"
REDIS_PORT="6379"
```

### Web (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Files Structure

```
/apps
  /api                        - NestJS 11 API
    /prisma/schema.prisma     - Database models
    /src
      /admin                  - Admin dashboard endpoints
      /auth                   - Magic link auth
      /batches                - Batch/script endpoints
      /exports                - CSV, PDF, R2 storage
      /generation             - OpenRouter, prompts, scoring
      /personas               - Persona CRUD
      /prisma                 - Prisma service
      /projects               - Project CRUD
      /queue                  - BullMQ job processing
      /settings               - User settings endpoints
    /swagger                  - Generated OpenAPI spec

  /web                        - Next.js 15 App
    /src
      /api
        /generated            - Orval-generated API client
        customInstance.ts     - Fetch wrapper for API calls
      /app
        /(dashboard)          - Protected routes
          /admin              - Admin dashboard
          /dashboard          - User dashboard
          /projects           - Project list
          /projects/[id]      - Project detail + generation
          /settings           - User settings
        /auth/callback        - Magic link callback
        /pricing              - Pricing page
      /components
        /layout               - Sidebar, navigation
        /ui                   - shadcn/ui components
      /lib
        auth.ts               - Auth hooks (useAuth, useRequireAuth)
        atoms.ts              - Jotai atoms for local state
        query-client.tsx      - React Query provider
        utils.ts              - Utility functions

/packages
  /shared                     - Shared types & Zod schemas

docker-compose.yml            - Postgres + Redis
Makefile                      - Dev commands
orval.config.cjs              - API client generation config
```

---

## Acceptance Checklist

- [x] Magic link login works end-to-end
- [x] Project wizard saves and reloads data
- [x] Generate scripts with concrete storyboard filming instructions
- [x] Forbidden phrases/claims are flagged in warnings
- [x] Regenerate changes tone while respecting constraints
- [x] Exports upload to R2 and download links work
- [x] Admin can manage users and access requests
- [x] Quality tiers affect model selection and pricing
- [x] Settings page allows profile updates and account deletion
- [x] API client auto-generates from OpenAPI spec
- [ ] App deployable with env vars only (needs testing)

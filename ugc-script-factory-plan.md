# UGC Script Factory — Plan & Claude Code Instructions (Updated Stack)

## Goal
Build an MVP SaaS that generates high-quality UGC video scripts (TikTok/Reels/Shorts) tailored to a product + audience, including:
- storyboard by shots (what to film)
- on-screen text
- spoken lines
- CTA variants
- filming checklist
- basic scoring and filtering
- export: PDF + CSV (for Google Sheets import)

No image/video generation.

---

## Updated, Explicit Stack (Use Exactly)
- Backend: **NestJS 11.1.11**
- DB: **Postgres + Prisma**
- Auth: **Magic links** (email-based)
- Storage: **S3-compatible (Cloudflare R2)**
- LLM: **OpenRouter** (you have an API key)
- Frontend: **Next.js 15.5.7 (App Router)**

Recommended supporting libs:
- Web UI: Tailwind + shadcn/ui
- Validation: Zod
- Email sending: Resend (or any SMTP provider; keep provider abstract)
- PDF generation: server-side HTML -> PDF (e.g., Playwright or a dedicated HTML-to-PDF library)
- CSV export: simple server-side generator (no dependency required)

---

## Repository Layout (Monorepo)
- /apps/web              (Next.js 15.5.7)
- /apps/api              (NestJS 11.1.11)
- /packages/shared       (shared types, zod schemas, prompt templates, constants)
- /packages/ui           (optional: shared UI components for web)

---

## Core Product Concepts
### Project
Persistent container:
- product description + offer
- audience persona(s)
- brand voice guidelines
- compliance / forbidden claims
- platforms: TikTok/Reels/Shorts
- language + region

### Generation Batch
Single run producing N scripts:
- settings: platform, language, count, angles, durations
- output: scripts + metadata + export links

### Script
Structured JSON:
- angle tag
- duration target (15/30/45)
- hook
- storyboard steps
- on-screen text lines
- spoken lines
- CTA variants
- filming checklist
- score + warnings

---

## Data Model (Prisma)
### tables
- User
- MagicLinkToken
- Project
- Persona
- Batch
- Script
- Export (or export fields on Batch)

High-level requirements:
- User has many Projects
- Project has many Personas
- Project has many Batches
- Batch has many Scripts
- Batch has optional Export links

Magic link requirements:
- MagicLinkToken: `tokenHash`, `userId`, `expiresAt`, `usedAt`, `createdAt`
- Token is single-use and time-limited.

---

## API Endpoints (REST)
### Auth (Magic Links)
- POST /auth/request-link
  - body: { email }
  - sends email with link: `${WEB_BASE_URL}/auth/callback?token=...`
- POST /auth/consume-link
  - body: { token }
  - verifies token, creates session/jwt, marks token used
- POST /auth/logout (optional)
- GET /auth/me (returns current user)

Session strategy (MVP):
- JWT access token stored in httpOnly cookie OR Next.js session cookie approach.
- Keep it simple: cookie-based JWT is fine for MVP.

### Projects
- POST /projects
- GET /projects
- GET /projects/:id
- PUT /projects/:id

### Personas
- POST /projects/:id/personas
- GET /projects/:id/personas
- PUT /personas/:id
- DELETE /personas/:id

### Generation
- POST /projects/:id/batches
  body:
  - requestedCount: number (30–200)
  - platform: "tiktok" | "reels" | "shorts"
  - angles: string[]
  - durations: number[] (15|30|45)
- GET /batches/:id
- GET /batches/:id/scripts
- POST /scripts/:id/regenerate
  body:
  - instruction: "shorter" | "more aggressive" | "more premium" | "more direct" | free text
- POST /batches/:id/export
  returns:
  - pdfUrl, csvUrl

---

## Frontend Screens (Next.js 15.5.7)
### 1) Auth
- email input -> “Send magic link”
- callback page consumes token and redirects to app

### 2) Project List
- create new project
- list existing projects

### 3) Project Setup Wizard (3 steps)
- Product
- Audience (personas)
- Brand Voice + Restrictions

### 4) Generate Page
- choose platform, angles, durations, count
- “Generate” -> show batch status
- results table: angle, duration, hook preview, score, warnings
- filters: angle, duration, min score
- open script details (drawer/modal)
- regenerate with quick modifiers

### 5) Exports
- Export PDF “Creator Pack”
- Export CSV “Producer Sheet”
- show links to download

---

## Script Output Schema (JSON)
Each script MUST conform to:

```json
{
  "angle": "objection_reversal",
  "duration": 30,
  "hook": "string",
  "storyboard": [
    {
      "t": "0-2s",
      "shot": "what is in frame + action",
      "onScreen": "text overlay",
      "spoken": "line spoken by creator",
      "broll": ["optional b-roll ideas"]
    }
  ],
  "ctaVariants": ["string", "string"],
  "filmingChecklist": ["string", "string"],
  "warnings": ["string"]
}
```

---

## LLM Integration (OpenRouter) — Implement Exactly
### Provider
- All LLM calls go through **OpenRouter**.
- Use a single service module in `/apps/api`:
  - `OpenRouterClient` (HTTP client + retries + timeouts)
  - `PromptBuilder` (pure functions)
  - `ScriptGeneratorService` (orchestrates two-pass generation)

### Recommended request pattern
- Use chat/completions style call to OpenRouter with:
  - `model` configurable via env (default to a strong, cost-effective model)
  - `temperature` ~0.7 for variety
  - strict JSON output instructions for Pass 2

### Two-pass generation
#### Pass 1: Plan (compact)
Input: project + persona + batch settings + angles + durations + target count
Output: array of N plans, each:
- angle
- duration
- hook idea (1 line)
- beats (6–10 bullet steps)
- compliance notes (risk flags)

#### Pass 2: Write (STRICT JSON)
For each plan:
- return JSON exactly matching schema
- enforce forbidden claims/phrases
- strong hook in first 2 seconds
- storyboard includes concrete filming instructions

### Failure handling
- If JSON parse fails: retry once with a “repair” prompt using the raw output.
- If still fails: mark script as failed with an error, continue others.

---

## Scoring (No extra model call in MVP)
Compute heuristic scores in API:
- Hook strength: specific pain/contrast/number (0–25)
- Clarity: benefit stated early (0–25)
- Visuality: concrete storyboard steps (0–25)
- Compliance: forbidden phrases absent (0–25)
Total 0–100.

Warnings:
- compliance risk
- too vague storyboard
- missing CTA

---

## Exports
### CSV (Producer Sheet)
Stable columns:
- scriptId, angle, duration, hook, firstLine, cta1, cta2, score, warnings

### PDF (Creator Pack)
- Project summary (product, offer, audience, tone, restrictions)
- Scripts grouped by angle
- Each script:
  - hook
  - storyboard table
  - filming checklist
  - CTA variants

Store exports to R2 and persist URLs on Batch.

---

## Storage (Cloudflare R2)
- Use S3-compatible SDK.
- Bucket:
  - `exports/{projectId}/{batchId}/creator-pack.pdf`
  - `exports/{projectId}/{batchId}/producer-sheet.csv`
- Use signed URLs or make bucket private + signed download endpoint.

---

## Auth (Magic Links) — Practical MVP Spec
- User enters email.
- API generates random token, stores tokenHash with expiry (15–30 minutes), unused.
- Email contains link with token.
- On callback:
  - API verifies tokenHash, expiry, unused
  - marks usedAt
  - issues session/JWT cookie
- Optional: auto-create user on first login.

Security notes:
- Token is single-use.
- Rate-limit request-link endpoint by IP + email.
- Do not reveal whether email exists (always respond OK).

---

## Development Plan (PR-sized chunks)
### PR1 — Foundation
- NestJS 11.1.11 app scaffold
- Prisma + Postgres connection + migrations
- User + MagicLinkToken schema
- Basic auth endpoints (request-link, consume-link) with mocked email sender

### PR2 — Web Skeleton
- Next.js 15.5.7 app scaffold
- Auth pages (request link + callback)
- Protected routes
- Project list + create (UI + API wiring)

### PR3 — Project + Persona CRUD
- Full Project CRUD (API + UI wizard)
- Persona CRUD

### PR4 — Generation Engine (OpenRouter)
- OpenRouter client module
- Two-pass generation + JSON parsing + persistence
- Batch endpoints + progress/status

### PR5 — UI for Scripts
- Batch results table, filters, detail modal
- Regenerate endpoint + UI controls
- Scoring + warnings shown

### PR6 — Exports to R2
- CSV generation
- PDF generation
- Upload to R2, persist URLs
- Export UI buttons

### PR7 — Hardening
- rate limits
- better validation errors
- logging with batch_id, project_id
- max limits (scripts per batch, text length)

---

## Environment Variables
### Web
- WEB_BASE_URL

### API
- DATABASE_URL
- JWT_SECRET
- WEB_BASE_URL

# Magic link email
- EMAIL_PROVIDER (e.g., "resend" or "smtp")
- EMAIL_FROM
- RESEND_API_KEY (if using Resend)
# or SMTP_* if using SMTP

# OpenRouter
- OPENROUTER_API_KEY
- OPENROUTER_BASE_URL (default: https://openrouter.ai/api/v1)
- OPENROUTER_MODEL (default: choose one model; allow override per env)

# R2 (S3-compatible)
- S3_ENDPOINT
- S3_REGION (R2 often uses "auto" or a placeholder; keep configurable)
- S3_BUCKET
- S3_ACCESS_KEY_ID
- S3_SECRET_ACCESS_KEY
- S3_PUBLIC_BASE_URL (optional, if using public URLs)

---

## Business Model

### Subscription Tiers

| Tier | Price | Scripts/mo | Features |
|------|-------|------------|----------|
| **Free** | $0 | 50 | 1 project, all angles, watermarked PDF preview |
| **Pro** | $12/mo | 500 | Unlimited projects, full export (PDF + CSV), unlimited personas |

### One-Time Packs

For burst usage or users who prefer no subscription:

| Pack | Scripts | Price | Per Script |
|------|---------|-------|------------|
| Starter | 100 | $5 | $0.05 |
| Growth | 500 | $19 | $0.04 |
| Scale | 2,000 | $59 | $0.03 |

Packs never expire. Subscription scripts reset monthly, packs are consumed first.

### Pricing Philosophy

- Script generation is cheap (LLM cost ~$0.01-0.03/script) — price accordingly
- Free tier is genuinely useful (50 scripts = full project test)
- Pro at $12/mo is less than a lunch — removes all friction
- Packs for agencies or one-off projects without commitment
- No artificial feature walls — Pro unlocks limits, not capabilities

### What's Free vs Pro

| Free | Pro |
|------|-----|
| 50 scripts/month | 500 scripts/month |
| 1 project | Unlimited projects |
| Watermarked PDF | Full PDF + CSV export |
| 1 persona | Unlimited personas |

### Launch Strategy

- First 500 users: Free Pro for 3 months
- Lifetime deal consideration: $49 one-time for early adopters
- Goal: users + feedback + word-of-mouth before optimizing revenue

See [ROADMAP.md](./ROADMAP.md) for future features and phases.

---

## Acceptance Checklist
- [ ] Magic link login works end-to-end.
- [ ] Project wizard saves and reloads data.
- [ ] Generate 50 scripts; each has concrete storyboard filming instructions.
- [ ] Forbidden phrases/claims are blocked and flagged.
- [ ] Regenerate changes tone/duration while respecting constraints.
- [ ] Exports upload to R2 and download links work.
- [ ] App deployable with env vars only.

End.

# Project Instructions for Claude

## Package Manager
Always use `pnpm`, never `npm` or `yarn`.

## Common Commands (via Makefile)
Use these Make commands instead of running pnpm directly:

| Command | Description |
|---------|-------------|
| `make install` | Install dependencies and generate Prisma client |
| `make dev` | Start API and Web dev servers |
| `make dev-api` | Start only API server (kills existing on port 3232) |
| `make dev-web` | Start only Web server |
| `make build` | Build API and Web for production |
| `make db-migrate` | Run Prisma migrations (interactive) |
| `make db-push` | Push schema to database (no migration) |
| `make api-generate` | Generate API client from OpenAPI spec |

## Database Migrations
- Prefer `make db-migrate` for schema changes (creates proper migrations)
- Use `make db-push` only for quick iteration, not production changes
- Never create migration files manually - let Prisma generate them

## API Client Generation
After adding/modifying API endpoints, run `make api-generate` to regenerate the frontend API client (uses Orval).

## Project Structure
- `apps/api` - NestJS backend
- `apps/web` - Next.js frontend
- Monorepo managed with pnpm workspaces

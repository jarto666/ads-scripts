.PHONY: help install dev build db-migrate db-push api-generate

help:
	@echo "Available commands:"
	@echo "  make install      - Install dependencies and generate Prisma client"
	@echo "  make dev          - Start API and Web dev servers"
	@echo "  make build        - Build API and Web for production"
	@echo "  make db-migrate   - Run Prisma migrations (dev)"
	@echo "  make db-push      - Push schema to database (no migration)"
	@echo "  make api-generate - Generate API client from OpenAPI spec"

install:
	pnpm install
	cd apps/api && pnpm exec prisma generate

dev:
	pnpm run dev

build:
	pnpm run build

db-migrate:
	cd apps/api && pnpm exec prisma migrate dev

db-push:
	cd apps/api && pnpm exec prisma db push

api-generate:
	pnpm --filter web api:generate

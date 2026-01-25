.PHONY: help install dev dev-api dev-web dev-api-watch build build-api build-web db-up db-down db-push db-migrate db-generate db-studio api-generate clean

# Default target
help:
	@echo "UGC Script Factory - Available commands:"
	@echo ""
	@echo "  make install      - Install all dependencies"
	@echo "  make dev          - Start all services (db + api + web + api-watch)"
	@echo "  make dev-api      - Start API server only"
	@echo "  make dev-web      - Start web server only"
	@echo "  make build        - Build all packages"
	@echo "  make build-api    - Build API"
	@echo "  make build-web    - Build web app"
	@echo ""
	@echo "Database:"
	@echo "  make db-up        - Start Postgres container"
	@echo "  make db-down      - Stop Postgres container"
	@echo "  make db-push      - Push Prisma schema to database"
	@echo "  make db-migrate   - Run Prisma migrations"
	@echo "  make db-generate  - Generate Prisma client"
	@echo "  make db-studio    - Open Prisma Studio"
	@echo ""
	@echo "API Client:"
	@echo "  make api-generate - Generate API client from OpenAPI spec"
	@echo ""
	@echo "  make clean        - Remove node_modules and build artifacts"

# Install dependencies
install:
	npm install
	cd packages/shared && npm run build
	cd apps/api && npx prisma generate

# Development
dev: db-up
	@echo "Starting development servers..."
	@make dev-api & sleep 3 && make dev-api-watch & make dev-web

dev-api:
	npm run dev -w apps/api

dev-web:
	npm run dev -w apps/web

dev-api-watch:
	npm run api:watch -w apps/web

# Build
build: build-shared build-api build-web

build-shared:
	cd packages/shared && npm run build

build-api:
	npm run build -w apps/api

build-web:
	npm run build -w apps/web

# Database
db-up:
	docker compose up -d postgres
	@echo "Waiting for Postgres to be ready..."
	@sleep 3

db-down:
	docker compose down

db-push:
	cd apps/api && npx prisma db push

db-migrate:
	cd apps/api && npx prisma migrate dev

db-generate:
	cd apps/api && npx prisma generate

db-studio:
	cd apps/api && npx prisma studio

# API client generation
api-generate:
	npm run api:generate -w apps/web

# Clean
clean:
	rm -rf node_modules
	rm -rf apps/api/node_modules apps/api/dist
	rm -rf apps/web/node_modules apps/web/.next
	rm -rf packages/shared/node_modules packages/shared/dist

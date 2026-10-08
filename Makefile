# Learnatu: one place for the everyday commands.   Run `make` to see them all.
# Every target is a thin wrapper around an npm script, so `npm run <name>` still works.

.DEFAULT_GOAL := help
.PHONY: help install run dev stop preview build package test check lint lint-fix validate ci update outdated \
        db-migrate db-migrate-remote deploy clean

VERSION := $(shell git rev-parse --short HEAD 2>/dev/null || echo local)

help: ## Show this list
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  \033[1m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

## ---- Run -------------------------------------------------------------------

install: ## Install dependencies (exactly as locked)
	npm ci

run: ## First-time friendly start: install if needed, set up the local database, then start the site
	@test -d node_modules || npm ci
	npm run db:migrate
	npm run dev

dev: ## Start the site locally at http://localhost:4321 (no setup steps)
	npm run dev

stop: ## Stop the local site
	-npx astro dev stop

preview: build ## Build, then serve the production build locally
	npm run preview

## ---- Build and package -----------------------------------------------------

build: ## Type-check and build the site into dist/
	npm run build

package: build ## Build, check the worker bundle, and write release/learnatu-<commit>.tar.gz
	npx wrangler deploy --dry-run --outdir release/worker
	mkdir -p release
	tar -czf release/learnatu-$(VERSION).tar.gz dist wrangler.jsonc migrations
	@echo "Packaged release/learnatu-$(VERSION).tar.gz"

deploy: ## Build and deploy to Cloudflare (needs wrangler login)
	npm run deploy

## ---- Quality: tests, types, lint -------------------------------------------

test: ## Run the tests
	npm test

check: ## Type-check (Astro + TypeScript)
	npm run check

lint: ## Find code problems (read-only)
	npm run lint

lint-fix: ## Fix lint problems that can be fixed automatically
	npm run lint:fix

validate: ## Check every course in content/courses/
	npm run course:validate

ci: validate lint check test build ## Everything a pull request must pass, in order

## ---- Dependencies ----------------------------------------------------------

outdated: ## List dependencies that have newer versions
	-npm outdated

update: ## Update dependencies within their allowed ranges, then re-run all checks
	npm update
	$(MAKE) ci

## ---- Database (Cloudflare D1) ----------------------------------------------

db-migrate: ## Apply database migrations to the local database
	npm run db:migrate

db-migrate-remote: ## Apply database migrations to the live database
	npm run db:migrate:remote

## ---- Housekeeping ----------------------------------------------------------

clean: ## Delete build output (dist/, release/, .astro/)
	rm -rf dist release .astro

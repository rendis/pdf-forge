-include .env
export

BASE_PATH ?=

# Dummy auth flag: make run DUMMY=1 / make dev DUMMY=1
ifdef DUMMY
export VITE_USE_MOCK_AUTH=true
endif

.PHONY: build build-core build-app embed-app run run-core run-dummy dev dev-dummy dev-app migrate test lint swagger docker-up docker-down clean help init-fork sync-upstream doctor check-upgrade

# Build everything (frontend embedded in Go binary)
build: embed-app build-core

build-core:
	$(MAKE) -C core build

build-app:
	VITE_BASE_PATH=$(BASE_PATH) $(MAKE) -C app build

# Build frontend and copy to Go embed location
embed-app: build-app
	@rm -rf core/internal/frontend/dist/*
	@cp -r app/dist/* core/internal/frontend/dist/
	@echo "Frontend assets embedded in core/internal/frontend/dist/"

# Auto-create .env from .env.example if missing
.env:
	@cp .env.example .env
	@echo "Created .env from .env.example"

# Run backend + frontend (Ctrl+C stops both)
run: .env
	@trap 'kill 0' INT TERM; \
	$(MAKE) -C core run & \
	$(MAKE) -C app dev & \
	wait

# Run backend only
run-core: .env
	$(MAKE) -C core run

# Development (hot reload backend + frontend)
dev: .env
	@trap 'kill 0' INT TERM; \
	$(MAKE) -C core dev & \
	$(MAKE) -C app dev & \
	wait

# Shorthand: run/dev with dummy auth (bypass OIDC)
run-dummy:
	$(MAKE) run DUMMY=1

dev-dummy:
	$(MAKE) dev DUMMY=1

# Run frontend only
dev-app:
	$(MAKE) -C app dev

# Database
migrate:
	$(MAKE) -C core migrate

# Quality
test:
	$(MAKE) -C core test

lint:
	$(MAKE) -C core lint

swagger:
	$(MAKE) -C core swagger

# Docker
docker-up:
	docker compose up --build

docker-down:
	docker compose down

# Cleanup
clean:
	$(MAKE) -C core clean
	$(MAKE) -C app clean
	@rm -rf core/internal/frontend/dist/*
	@touch core/internal/frontend/dist/.gitkeep

# Fork workflow
init-fork:
	@git remote add upstream https://github.com/rendis/pdf-forge.git 2>/dev/null || echo "upstream remote already exists"
	@git config merge.ours.driver true
	@echo "Done. Use 'make check-upgrade VERSION=vX.Y.Z' to check for updates."

sync-upstream:
	@if [ -z "$(VERSION)" ]; then \
		echo "Usage: make sync-upstream VERSION=v1.2.0"; \
		echo ""; \
		echo "Available versions:"; \
		git fetch upstream --tags 2>/dev/null; \
		git tag -l "v*" --sort=-v:refname | head -10; \
		exit 1; \
	fi
	@git fetch upstream --tags
	git merge $(VERSION) --no-edit
	@echo ""
	@echo "If conflicts occurred, resolve them (your code in core/extensions/ takes priority)."
	@echo "Then run: make build && make test"

doctor:
	@echo "=== pdf-forge doctor ==="
	@echo ""
	@printf "Go.............. " && go version > /dev/null 2>&1 && echo "ok" || echo "MISSING"
	@printf "Typst........... " && typst --version > /dev/null 2>&1 && echo "ok" || echo "MISSING"
	@printf "PostgreSQL...... " && pg_isready > /dev/null 2>&1 && echo "ok" || echo "not running"
	@printf "pnpm............ " && pnpm --version > /dev/null 2>&1 && echo "ok" || echo "MISSING"
	@printf "Upstream remote. " && git remote get-url upstream > /dev/null 2>&1 && echo "ok" || echo "MISSING (run: make init-fork)"
	@printf "Go build........ " && go build -C core ./... > /dev/null 2>&1 && echo "ok" || echo "FAIL"
	@printf "Go modules...... " && go -C core mod verify > /dev/null 2>&1 && echo "ok" || echo "FAIL"
	@echo ""
	@echo "Done."

check-upgrade:
	@if [ -z "$(VERSION)" ]; then \
		echo "Usage: make check-upgrade VERSION=v1.2.0"; \
		echo ""; \
		git fetch upstream --tags 2>/dev/null || { echo "ERROR: upstream remote not found. Run: make init-fork"; exit 1; }; \
		echo "Available versions:"; \
		git tag -l "v*" --sort=-v:refname | head -10; \
		exit 1; \
	fi
	@git fetch upstream --tags 2>/dev/null || { echo "ERROR: upstream remote not found. Run: make init-fork"; exit 1; }
	@echo "=== Upgrade check: $(VERSION) ==="
	@echo ""
	@printf "Merge conflicts......... " ; \
	MERGE_BASE=$$(git merge-base HEAD $(VERSION) 2>/dev/null); \
	if [ -z "$$MERGE_BASE" ]; then \
		echo "CANNOT DETERMINE (no common ancestor)"; \
	elif git merge-tree $$MERGE_BASE HEAD $(VERSION) 2>/dev/null | grep -q "^<<<<<<"; then \
		echo "CONFLICTS FOUND"; \
		echo "  Files with conflicts:"; \
		git merge-tree $$MERGE_BASE HEAD $(VERSION) 2>/dev/null | grep "^+++ b/" | sed 's/^+++ b\//    /' | head -10; \
	else \
		echo "ok (clean merge)"; \
	fi
	@printf "Build after merge....... " ; \
	STASHED=false; \
	git stash push -q -m "check-upgrade-temp" 2>/dev/null && STASHED=true; \
	git merge --no-commit --no-ff $(VERSION) > /dev/null 2>&1; \
	BUILD_OK=true; \
	go build -C core ./... > /dev/null 2>&1 || BUILD_OK=false; \
	git merge --abort 2>/dev/null; \
	if [ "$$STASHED" = "true" ]; then git stash pop -q 2>/dev/null; fi; \
	if [ "$$BUILD_OK" = "true" ]; then echo "ok"; else echo "FAIL (extensions may need updates)"; fi
	@printf "Interface changes........ " ; \
	if git diff HEAD...$(VERSION) --name-only 2>/dev/null | grep -q "internal/core/port"; then \
		echo "CHANGED (review core/internal/core/port/)"; \
	else \
		echo "ok (no changes)"; \
	fi
	@printf "New migrations........... " ; \
	MIGRATIONS=$$(git diff HEAD...$(VERSION) --name-only 2>/dev/null | grep "migrations/sql" | wc -l | tr -d ' '); \
	if [ "$$MIGRATIONS" -gt 0 ]; then echo "$$MIGRATIONS new (run: make migrate after upgrade)"; else echo "none"; fi
	@echo ""
	@echo "Changes summary:"
	@git diff --stat HEAD...$(VERSION) 2>/dev/null | tail -5
	@echo ""
	@echo "Ready. Run: make sync-upstream VERSION=$(VERSION)"

help:
	@echo "=== Build ==="
	@echo "  build          Build frontend + embed + Go binary (single binary)"
	@echo "  build-core     Build Go backend only (uses existing embedded assets)"
	@echo "  build-app      Build React frontend only (outputs to app/dist/)"
	@echo "  embed-app      Build frontend and copy to Go embed location"
	@echo ""
	@echo "=== Development ==="
	@echo "  run            Run backend + frontend"
	@echo "  run-dummy      Same as run, with dummy auth (no OIDC needed)"
	@echo "  run-core       Run backend only"
	@echo "  dev            Hot reload backend + frontend"
	@echo "  dev-dummy      Same as dev, with dummy auth (no OIDC needed)"
	@echo "  dev-app        Start Vite dev server only"
	@echo "  migrate        Apply database migrations"
	@echo "  test           Run Go tests"
	@echo "  lint           Run golangci-lint"
	@echo "  swagger        Regenerate OpenAPI spec"
	@echo ""
	@echo "=== Docker ==="
	@echo "  docker-up      Start all services with Docker Compose"
	@echo "  docker-down    Stop all services"
	@echo ""
	@echo "=== Fork Workflow ==="
	@echo "  init-fork      Set up upstream remote + merge drivers"
	@echo "  doctor         Check system dependencies and build health"
	@echo "  check-upgrade  Check if VERSION is safe to merge (e.g., VERSION=v1.2.0)"
	@echo "  sync-upstream  Merge upstream VERSION into current branch"
	@echo ""
	@echo "  clean          Remove all build artifacts"
	@echo ""
	@echo "=== Flags ==="
	@echo "  DUMMY=1        Force dummy auth (bypass OIDC). Example: make dev DUMMY=1"
	@echo "  BASE_PATH=X    URL prefix for all routes. Example: BASE_PATH=/pdf-forge make build"

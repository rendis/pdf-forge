# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Rules

- **NEVER** use `slog.Info()` → always `slog.InfoContext(ctx, ...)`
- **NEVER** use `log` package → `depguard` enforces `log/slog` only
- **ALWAYS** run `make swagger` after API changes
- **ALWAYS** read files before suggesting changes
- **NEVER** modify DB schema SQL without understanding migration ordering
- **ALWAYS** include multi-tenant headers (`X-Tenant-ID`, `X-Workspace-ID`) in API calls
- **NEVER** change module path in `core/go.mod` — must stay `github.com/rendis/pdf-forge` even in forks

## Project Overview

**pdf-forge**: Forkeable multi-tenant PDF template engine powered by Typst.

Fork → customize `core/extensions/` → `docker compose up` → done.

**Stack**: Go 1.25 + PostgreSQL 16 + Typst + React 19 (independent SPA)

**Key terms**: Tenant → Workspace → Template → Version (DRAFT→PUBLISHED→ARCHIVED). See [core/docs/glossary.md](core/docs/glossary.md).

**Non-Goals**: NOT a WYSIWYG editor, Word generator, CMS, signature platform, or reporting tool.

## Commands

```bash
# Root Makefile (orchestrator — delegates to core/ and app/)
make build            # Build backend + frontend
make build-core       # Build Go backend only
make build-app        # Build React frontend only
make run              # Run API server
make migrate          # Apply database migrations
make dev              # Hot reload backend (air)
make dev-app          # Start Vite dev server
make test             # Unit tests
make lint             # golangci-lint
make swagger          # Regenerate OpenAPI spec
make docker-up        # Start all services with Docker Compose
make clean            # Remove all build artifacts

# Fork workflow
make init-fork                        # Set up upstream remote + merge drivers
make doctor                           # Check system dependencies and build health
make check-upgrade VERSION=v1.2.0     # Verify if upgrade is safe before merging
make sync-upstream VERSION=v1.2.0     # Merge upstream release into current branch

# Single test (from core/)
go test -C core -run TestFunctionName ./internal/core/service/...

# Format Go code
make -C core fmt
```

## Repository Structure

```plaintext
core/                            ← Backend Go (module: github.com/rendis/pdf-forge)
  cmd/api/
    main.go                      ← Entrypoint (run server / migrate)
    bootstrap/
      engine.go                  ← Engine: config, extensions, lifecycle
      initializer.go             ← Manual DI wiring (no Wire)
      preflight.go               ← Startup checks (Typst, DB, auth)
  extensions/                    ← USER CUSTOMIZATION POINT
    register.go                  ← Registers all extensions with Engine
    injectors/                   ← Custom injector implementations
    mapper.go, init.go,          ← RequestMapper, InitFunc, Provider,
    provider.go, middleware.go   ← Middleware stubs
  internal/
    core/entity/                 ← Domain types
    core/port/                   ← Interfaces (Injector, RequestMapper, etc.)
    core/service/                ← Business logic
    adapters/primary/http/       ← Gin controllers, DTOs
    adapters/secondary/database/ ← PostgreSQL repositories
    extensions/injectors/        ← Built-in injectors (date_now, time_now, etc.)
    infra/                       ← Config, logging, server, registry
    migrations/sql/              ← Embedded SQL migrations
  settings/app.yaml              ← Default configuration
  docs/                          ← Architecture, auth matrix, extensibility
app/                             ← Frontend React SPA (independent service)
  src/                           ← React 19 + TypeScript + TanStack Router
  nginx.conf                     ← SPA fallback + API reverse proxy
  Dockerfile                     ← Multi-stage: node build + nginx serve
docker-compose.yaml              ← Full stack: postgres + api + web
```

## User Customization (`core/extensions/`)

All user code goes in `core/extensions/`. Entry point: `core/extensions/register.go`.

Called from `core/cmd/api/main.go`. Users never modify `core/internal/` or `core/cmd/api/bootstrap/`.

Types imported from:

- `github.com/rendis/pdf-forge/internal/core/port` — interfaces
- `github.com/rendis/pdf-forge/internal/core/entity` — domain types
- `github.com/rendis/pdf-forge/cmd/api/bootstrap` — Engine type

## Extension Points

Interfaces in `core/internal/core/port/`:

| Interface                     | File                               | Purpose                                |
| ----------------------------- | ---------------------------------- | -------------------------------------- |
| `Injector`                    | `injector.go`                      | Custom injectable resolution           |
| `InitFunc`                    | `injector.go`                      | Shared setup before resolution         |
| `RequestMapper`               | `mapper.go`                        | Transform render request data          |
| `WorkspaceInjectableProvider` | `workspace_injectable_provider.go` | Dynamic workspace-specific injectables |
| `RenderAuthenticator`         | `render_authenticator.go`          | Custom auth for render endpoints       |

**Middleware**: `engine.UseMiddleware()` (global) / `engine.UseAPIMiddleware()` (API only)

**Lifecycle**: `engine.OnStart()` / `engine.OnShutdown()` (shutdown runs LIFO)

See [core/docs/extensibility-guide.md](core/docs/extensibility-guide.md) for full documentation.

## Architecture

- **Hexagonal**: core (entities, ports, services) + adapters (HTTP, DB)
- **Runtime DI**: `core/cmd/api/bootstrap/initializer.go` (no Wire — manual wiring)
- **Preflight checks**: Typst binary, DB connectivity, schema version, auth validation at startup
- **Concurrency**: Semaphore limits concurrent renders (`typst.max_concurrent`)

### Render Flow

```plaintext
POST /api/v1/workspace/document-types/{code}/render
  → Acquire semaphore → Run InitFuncs → Resolve injectables (topological order)
  → Build Typst source → Resolve images (cached) → Typst CLI → PDF bytes
```

### Dual Auth System

Two separate auth flows in `core/internal/infra/server/http.go`:

- **Panel routes** (`/api/v1/*`): Full OIDC → identity lookup → role/membership check
- **Render routes** (`/api/v1/workspace/*/render`): Priority chain: dummy auth → custom `RenderAuthenticator` → OIDC render provider. No workspace membership check.

### Middleware Stack Order

Recovery → Logger → CORS → Global middleware → Auth → Identity → Roles → API middleware → Controller

## HTTP Routes

| Route                                       | Auth                                           |
| ------------------------------------------- | ---------------------------------------------- |
| `/api/v1/*` (except render)                 | Panel OIDC + Identity                          |
| `/api/v1/workspace/document-types/*/render` | Panel + Render providers (NO membership check) |
| `/swagger/*`, `/health`, `/ready`           | None                                           |

Frontend served independently via nginx (port 3000 in docker-compose).

**Headers**: `X-Tenant-ID`, `X-Workspace-ID`, `Authorization` (Bearer JWT)

## RBAC

System: SUPERADMIN · Tenant: OWNER, ADMIN · Workspace: OWNER, ADMIN, EDITOR, OPERATOR, VIEWER

See [core/docs/authorization-matrix.md](core/docs/authorization-matrix.md).

## Configuration

YAML (`core/settings/app.yaml`) + env vars (`DOC_ENGINE_*` prefix).

Key settings: `typst.bin_path`, `typst.max_concurrent` (default: 20), `server.port` (default: 8080)

Auth: `auth.panel` (OIDC for panel) + `auth.render_providers[]` (additional OIDC for render). Omit `auth` for dummy mode.

CORS: `server.cors.allowed_origins` (default: `["*"]`)

See [core/docs/configuration.md](core/docs/configuration.md).

## Database

PostgreSQL 16, migrations in `core/internal/migrations/sql/` (golang-migrate, embedded)

Run: `make migrate` (from root or core/)

Schemas: `tenancy`, `identity`, `content`, `organizer`

## Linter Constraints

Config: `.golangci.yml` (project root). Key enforced limits:

- `funlen`: 60 lines / 40 statements
- `gocognit`: 15, `gocyclo`: 15, `nestif`: 4
- `depguard`: stdlib `log` package forbidden, use `log/slog`
- `gosec`: enabled (excludes G104, G115)

## Frontend

See [app/AGENTS.md](app/AGENTS.md) for detailed frontend guidance. Key points:

- React 19 + TanStack Router (file-based) + Zustand + Tailwind CSS + Radix UI
- API client: Axios with auto-attached JWT + tenant/workspace headers
- Design system: [app/docs/design_system.md](app/docs/design_system.md)
- Env: `VITE_API_URL` (dev: `http://localhost:8080`, prod: `/api`)

## Documentation

**Read the relevant doc BEFORE working on that area.**

| Area            | Doc                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| Domain concepts | [core/docs/glossary.md](core/docs/glossary.md)                                                               |
| Config & deploy | [core/docs/configuration.md](core/docs/configuration.md), [core/docs/deployment.md](core/docs/deployment.md) |
| Extending       | [core/docs/extensibility-guide.md](core/docs/extensibility-guide.md)                                         |
| Auth & RBAC     | [core/docs/authorization-matrix.md](core/docs/authorization-matrix.md)                                       |
| Architecture    | [core/docs/architecture.md](core/docs/architecture.md), [core/docs/decisions.md](core/docs/decisions.md)     |
| Frontend        | [app/AGENTS.md](app/AGENTS.md)                                                                               |
| Design system   | [app/docs/design_system.md](app/docs/design_system.md)                                                       |
| Fork workflow   | [FORKING.md](FORKING.md)                                                                                     |

## PR Guidelines

1. `make build && make test && make lint`
2. `make swagger` if API changed
3. Update README.md if public API or config changed

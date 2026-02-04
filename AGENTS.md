# AGENTS.md

## Critical Rules

- **NEVER** use `slog.Info()` → always `slog.InfoContext(ctx, ...)`
- **ALWAYS** run `make swagger` after API changes
- **ALWAYS** read files before suggesting changes
- **NEVER** import from `internal/` in consumer code → only `sdk/`
- **NEVER** modify DB schema SQL without understanding migration ordering
- **ALWAYS** include multi-tenant headers (`X-Tenant-ID`, `X-Workspace-ID`) in API calls

## Project Overview

**pdf-forge**: Go module for multi-tenant PDF template building via Typst.

```textplain
go get github.com/rendis/pdf-forge
```

**Stack**: Go 1.25 + PostgreSQL 16 + Typst + React 19 (embedded SPA)

**Key terms**: Tenant → Workspace → Template → Version (DRAFT→PUBLISHED→ARCHIVED). See [docs/glossary.md](docs/glossary.md).

**Non-Goals**: NOT a WYSIWYG editor, Word generator, CMS, signature platform, or reporting tool.

## Commands

```bash
make build    # Build
make run      # Run (loads .env)
make test     # Unit tests
make lint     # golangci-lint
make swagger  # Regenerate OpenAPI spec
make dev      # Hot reload (air)
```

## Repository Structure

```plaintext
sdk/                  → Public API (only importable package)
cmd/api/              → Standalone server binary
cmd/pdfforge-cli/     → CLI tool (see README.md there)
internal/
  core/entity/        → Domain types
  core/port/          → Interfaces (Injector, RequestMapper, etc.)
  core/service/       → Business logic
  adapters/primary/http/ → Gin controllers, DTOs
  adapters/secondary/database/postgres/ → 17 repositories
  extensions/injectors/ → Built-in injectors
  infra/              → Config, logging, server, registry
  migrations/sql/     → Embedded SQL migrations
  frontend/           → Embedded React SPA
examples/quickstart/  → Reference project
docs/                 → Architecture, auth matrix, extensibility
```

## SDK Public API (`sdk/`)

Only importable package. Everything else is `internal/`.

| File         | Contents                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| `engine.go`  | `Engine`, `New()`, `Run()`, `RunMigrations()`, `SetWorkspaceInjectableProvider()`, `SetRenderAuthenticator()` |
| `options.go` | `WithConfigFile()`, `WithConfig()`, `WithI18nFile()`, `WithDevFrontendURL()`                                  |
| `types.go`   | Re-exported types for consumers                                                                               |

## Extension Points

See `internal/core/port/` for interfaces:

| Interface                     | File                               | Purpose                                |
| ----------------------------- | ---------------------------------- | -------------------------------------- |
| `Injector`                    | `injector.go`                      | Custom injectable resolution           |
| `InitFunc`                    | `injector.go`                      | Shared setup before resolution         |
| `RequestMapper`               | `mapper.go`                        | Transform render request data          |
| `WorkspaceInjectableProvider` | `workspace_injectable_provider.go` | Dynamic workspace-specific injectables |
| `RenderAuthenticator`         | `render_authenticator.go`          | Custom auth for render endpoints       |

**Middleware**: `engine.UseMiddleware()` (global) / `engine.UseAPIMiddleware()` (API only)

**Lifecycle**: `engine.OnStart()` / `engine.OnShutdown()`

See [docs/extensibility-guide.md](docs/extensibility-guide.md) for full documentation.

## Built-in Injectors

`date_now`, `time_now`, `date_time_now`, `year_now`, `month_now`, `day_now`

Demo injectors in `internal/extensions/injectors/`: `example_value`, `example_image`, `example_list`, `example_table`

## Architecture

- **Hexagonal**: core (entities, ports, services) + adapters (HTTP, DB)
- **Runtime DI**: `sdk/initializer.go` (no Wire)
- **Preflight checks**: Typst, DB, schema, auth validation at startup
- **Concurrency**: Semaphore limits concurrent renders (`typst.max_concurrent`)

### Render Flow

```textplain
POST /api/v1/workspace/document-types/{code}/render
  → Acquire semaphore → Run InitFuncs → Resolve injectables (topological order)
  → Build Typst source → Resolve images (cached) → Typst CLI → PDF bytes
```

## HTTP Routes

| Route                                       | Auth                                           |
| ------------------------------------------- | ---------------------------------------------- |
| `/`                                         | None (SPA)                                     |
| `/api/v1/*` (except render)                 | Panel OIDC + Identity                          |
| `/api/v1/workspace/document-types/*/render` | Panel + Render providers (NO membership check) |
| `/swagger/*`, `/health`, `/ready`           | None                                           |

**Headers**: `X-Tenant-ID`, `X-Workspace-ID`, `Authorization` (Bearer JWT)

## RBAC

System: SUPERADMIN · Tenant: OWNER, ADMIN · Workspace: OWNER, ADMIN, EDITOR, OPERATOR, VIEWER

See [docs/authorization-matrix.md](docs/authorization-matrix.md).

## Configuration

YAML (`settings/app.yaml`) + env vars (`DOC_ENGINE_*` prefix).

Key settings: `typst.bin_path`, `typst.max_concurrent` (default: 20), `server.port` (default: 8080)

Auth: `auth.panel` (OIDC for panel) + `auth.render_providers[]` (additional OIDC for render)

See [docs/configuration.md](docs/configuration.md).

## Database

PostgreSQL 16, migrations in `internal/migrations/sql/` (golang-migrate, embedded)

Run: `pdfforge-cli migrate` or `engine.RunMigrations()`

Schemas: `tenancy`, `identity`, `content`, `organizer`

## CLI

See [cmd/pdfforge-cli/README.md](cmd/pdfforge-cli/README.md) for full documentation.

Quick reference:

| Command                    | Description      |
| -------------------------- | ---------------- |
| `pdfforge-cli`             | Interactive menu |
| `pdfforge-cli init <name>` | Scaffold project |
| `pdfforge-cli migrate`     | Apply migrations |
| `pdfforge-cli doctor`      | Health checks    |

## Documentation

**Read the relevant doc BEFORE working on that area.**

| Area            | Doc                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------- |
| Domain concepts | [docs/glossary.md](docs/glossary.md)                                                     |
| Config & deploy | [docs/configuration.md](docs/configuration.md), [docs/deployment.md](docs/deployment.md) |
| Extending       | [docs/extensibility-guide.md](docs/extensibility-guide.md)                               |
| Auth & RBAC     | [docs/authorization-matrix.md](docs/authorization-matrix.md)                             |
| Architecture    | [docs/architecture.md](docs/architecture.md), [docs/decisions.md](docs/decisions.md)     |
| Frontend        | [apps/web-client/AGENTS.md](apps/web-client/AGENTS.md)                                   |
| Design system   | [apps/web-client/docs/design_system.md](apps/web-client/docs/design_system.md)           |

## AI Agent Skill

```bash
npx skills add https://github.com/rendis/pdf-forge --skill pdf-forge
```

## Available Skills

| Skill                           | When to Use                  |
| ------------------------------- | ---------------------------- |
| **pdf-forge**                   | Building/extending pdf-forge |
| **feature-dev**                 | Multi-layer features         |
| **commit** / **commit-push-pr** | Git operations               |
| **code-review**                 | PR review                    |

## PR Guidelines

1. `make build && make test && make lint`
2. `make swagger` if API changed
3. Update README.md if public API or config changed

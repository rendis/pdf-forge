# AGENTS.md

## Project Overview

**pdf-forge** is an installable Go module for multi-tenant document template building with on-demand PDF generation via Typst.

Users `go get github.com/rendis/pdf-forge`, register custom injectors/mappers, and call `engine.Run()`.

**Stack**: Go 1.25 + PostgreSQL 16 + Typst + React 19 (embedded SPA)

**Key terms**: Tenant (business unit) → Workspace (operational unit) → Template → Template Version (DRAFT→PUBLISHED→ARCHIVED). Injectables are variables injected into templates. See [docs/glossary.md](docs/glossary.md) for full definitions.

## Non-Goals

pdf-forge is **NOT**: a standalone WYSIWYG editor, a Word/DOCX generator (PDF only via Typst), a CMS, a digital signature platform, or a general-purpose reporting tool.

## Repository Structure

```plaintext
sdk/                  → Public API facade (Engine, types, options)
cmd/
  api/                → Standalone server binary
  pdfforge-cli/       → CLI tool (init, migrate, doctor, version, update)
skills/
  pdf-forge/          → AI agent skill (install via: npx skills add https://github.com/rendis/pdf-forge --skill pdf-forge)
internal/
  core/
    entity/           → Domain types (InjectableValue, TableValue, ListValue, etc.)
    port/             → Interfaces (Injector, RequestMapper, InitFunc, repositories)
    service/          → Business logic (rendering, injectables, templates, organization)
    usecase/          → Input ports
    validation/       → Content validation
    formatter/        → Locale-aware formatting (date, number, phone, RUT, bool)
  adapters/
    primary/http/     → Gin controllers, DTOs, mappers, middleware
    secondary/
      database/postgres/ → Repository implementations (17 repos)
  extensions/
    injectors/datetime/ → Built-in injectors (date_now, time_now, etc.)
  infra/
    config/           → YAML + env config loading (Viper)
    logging/          → Context-aware slog handler
    server/           → HTTP server setup (Gin, CORS, SPA serving)
    registry/         → Injector/mapper registries
  migrations/
    sql/              → Embedded SQL migrations (golang-migrate)
  frontend/           → Embedded React SPA (go:embed)
examples/quickstart/  → Reference project
settings/             → Config templates (app.yaml, injectors.i18n.yaml)
docs/                 → Architecture, authorization matrix, extensibility guide
```

## Quick Start

```bash
make build                # Build
make run                  # Run (loads .env)
make test                 # Unit tests
make fmt                  # gofmt
make lint                 # golangci-lint
make swagger              # Regenerate OpenAPI spec
make dev                  # Hot reload (air)
```

## SDK Public API (`sdk/`)

The only importable package for consumers. Everything else is `internal/`.

| File             | Contents                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `engine.go`      | `Engine`, `New()`, `Run()`, `RunMigrations()`, `SetWorkspaceInjectableProvider()`, `SetRenderAuthenticator()`                   |
| `options.go`     | `WithConfigFile()`, `WithConfig()`, `WithI18nFile()`, `WithDevFrontendURL()`                                                    |
| `types.go`       | Re-exported types: `Injector`, `ResolveFunc`, `InitFunc`, `RequestMapper`, `WorkspaceInjectableProvider`, `RenderAuthenticator` |
| `initializer.go` | Runtime DI wiring (replaces Wire)                                                                                               |
| `preflight.go`   | Startup checks: Typst CLI, DB, schema, auth                                                                                     |

## Key Interfaces (Extension Points)

### Injector (`internal/core/port/injector.go`)

```go
type Injector interface {
    Code() string
    Resolve() (ResolveFunc, []string)  // func + dependency codes
    IsCritical() bool
    Timeout() time.Duration
    DataType() ValueType
    DefaultValue() *InjectableValue
    Formats() *FormatConfig
}
```

### RequestMapper (`internal/core/port/mapper.go`)

```go
type RequestMapper interface {
    Map(ctx context.Context, mapCtx *MapperContext) (any, error)
}
```

### InitFunc (`internal/core/port/injector.go`)

```go
type InitFunc func(ctx context.Context, injCtx *InjectorContext) (any, error)
```

### WorkspaceInjectableProvider (`internal/core/port/workspace_injectable_provider.go`)

Dynamic workspace-specific injectables. Implement this to provide custom injectables per workspace at runtime (when editor opens), not at startup.

```go
type WorkspaceInjectableProvider interface {
    // GetInjectables returns available injectables for a workspace.
    // Called when editor opens. Use injCtx.TenantCode() and injCtx.WorkspaceCode().
    GetInjectables(ctx context.Context, injCtx *entity.InjectorContext) (*GetInjectablesResult, error)

    // ResolveInjectables resolves a batch of injectable codes.
    // Return (nil, error) for CRITICAL failures, (result, nil) with result.Errors for non-critical.
    ResolveInjectables(ctx context.Context, req *ResolveInjectablesRequest) (*ResolveInjectablesResult, error)
}
```

Register via `engine.SetWorkspaceInjectableProvider(provider)`. See `examples/quickstart/extensions/workspace_provider.go`.

### RenderAuthenticator (`internal/core/port/render_authenticator.go`)

Custom authentication for render endpoints. If registered, replaces OIDC for render (panel OIDC continues working).

```go
type RenderAuthenticator interface {
    // Authenticate validates the request and returns claims.
    // Return (claims, nil) if valid, (nil, error) to reject with 401.
    Authenticate(c *gin.Context) (*RenderAuthClaims, error)
}

type RenderAuthClaims struct {
    UserID   string         // Caller identifier (required)
    Email    string         // Optional
    Name     string         // Optional
    Provider string         // Auth provider name
    Extra    map[string]any // Custom claims
}
```

Register via `engine.SetRenderAuthenticator(auth)`. See [docs/extensibility-guide.md](docs/extensibility-guide.md#custom-render-authentication).

### Middleware (`sdk/types.go`)

```go
type Middleware = gin.HandlerFunc
```

Register via:

- `engine.UseMiddleware(mw)` - all routes (after CORS, before auth)
- `engine.UseAPIMiddleware(mw)` - `/api/v1/*` only (after auth, user context available)

**Execution order**:

```plaintext
Global: Recovery → Logger → CORS → [User Global] → Routes
API:    Operation → Auth → Identity → Roles → [User API] → Controller
```

See `examples/quickstart/extensions/middleware.go`.

### Lifecycle Hooks (`sdk/engine.go`)

```go
// OnStart - runs AFTER config/preflight, BEFORE HTTP server
engine.OnStart(func(ctx context.Context) error { ... })

// OnShutdown - runs AFTER HTTP server stops, BEFORE exit
engine.OnShutdown(func(ctx context.Context) error { ... })
```

**Important**: Both hooks are synchronous. For background processes, spawn a goroutine in `OnStart` and clean up in `OnShutdown`.

See `examples/quickstart/main.go` for background process pattern.

## Built-in Injectors

| Code            | Data Type | Description                                             |
| --------------- | --------- | ------------------------------------------------------- |
| `date_now`      | TIME      | Current date (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, long) |
| `time_now`      | TIME      | Current time (HH:mm, HH:mm:ss, hh:mm a)                 |
| `date_time_now` | TIME      | Current date+time                                       |
| `year_now`      | NUMBER    | Current year                                            |
| `month_now`     | NUMBER    | Current month (number, name, short_name)                |
| `day_now`       | NUMBER    | Current day of month                                    |

Demo injectors: `example_value`, `example_image`, `example_list`, `example_table` in `internal/extensions/injectors/`.

## Architecture Patterns

- **Hexagonal Architecture**: core (entities, ports, services) + adapters (HTTP, DB)
- **Runtime DI**: `sdk/initializer.go` wires all components manually (no Wire)
- **Preflight checks**: Validates Typst, DB, schema, auth before starting
- **Concurrency control**: Semaphore limits concurrent Typst renders
- **Image caching**: Disk-based with TTL and auto-cleanup
- **Template caching**: In-memory LRU for compiled templates

### Render Happy Path

```plaintext
API Request (POST /api/v1/workspace/document-types/{code}/render)
  │
  ├─ 1. Acquire semaphore slot (max_concurrent, timeout → ErrRendererBusy)
  ├─ 2. Run InitFuncs (shared setup)
  ├─ 3. Resolve injectables (dependency graph, topological order)
  │     └─ Non-critical fails → log + default value
  ├─ 4. Build Typst source (PortableDoc → Typst markup)
  ├─ 5. Resolve images (disk cache or temp download)
  │     └─ Download fails → 1x1 gray PNG placeholder
  ├─ 6. Typst CLI subprocess → PDF bytes
  └─ 7. Return { PDF []byte, Filename, PageCount }
```

## HTTP Server (`internal/infra/server/http.go`)

| Route                                       | Purpose                        | Auth                     |
| ------------------------------------------- | ------------------------------ | ------------------------ |
| `/`                                         | Embedded React SPA (dev proxy) | None                     |
| `/api/v1/*` (except render)                 | Panel API (UI/management)      | Panel OIDC + Identity    |
| `/api/v1/workspace/document-types/*/render` | Render API                     | Panel + Render providers |
| `/swagger/*`                                | Swagger UI                     | None                     |
| `/health`, `/ready`                         | Health checks                  | None                     |

**Panel vs Render Auth**:

- **Panel routes**: Use `auth.panel` provider only. Full identity context (DB user lookup).
- **Render routes**: Accept `auth.panel` + `auth.render_providers`. NO identity lookup, NO membership validation.

**Multi-Tenant Headers**: `X-Tenant-ID` (UUID), `X-Workspace-ID` (UUID), `Authorization` (Bearer JWT, omit in dummy mode).

**Render Endpoint Security**: `POST /api/v1/workspace/document-types/{code}/render` is **public by design**:

- Only validates OIDC token (panel or render provider)
- Does NOT validate workspace membership or roles
- Custom authorization via `engine.UseAPIMiddleware()`

```go
engine.UseAPIMiddleware(func(c *gin.Context) {
    if strings.HasPrefix(c.Request.URL.Path, "/api/v1/workspace/document-types") {
        // Custom validation here (API key, claims, etc.)
    }
    c.Next()
})
```

## RBAC

System: SUPERADMIN · Tenant: OWNER, ADMIN · Workspace: OWNER, ADMIN, EDITOR, OPERATOR, VIEWER

See [docs/authorization-matrix.md](docs/authorization-matrix.md).

## Configuration

YAML (`settings/app.yaml`) + env vars (`DOC_ENGINE_*` prefix).

**Auth config (new format)**:

```yaml
auth:
  panel: # OIDC for web panel (login/UI)
    name: "web-panel"
    issuer: "https://auth.example.com/realms/web"
    jwks_url: "https://auth.example.com/.../certs"
    audience: "pdf-forge" # optional
  render_providers: # Additional OIDC for render only
    - name: "services"
      issuer: "https://internal.auth.com"
      jwks_url: "https://internal.auth.com/.well-known/jwks.json"
```

**Legacy format** (still supported): `oidc_providers` list. First provider → panel, all → render.

**Other key settings**:

- `typst.bin_path` → Typst CLI binary path
- `typst.max_concurrent` → parallel render limit (default: 20)
- `server.port` → HTTP port (default: 8080, also `PORT` env var)

Full reference: [docs/configuration.md](docs/configuration.md).

## Database

- PostgreSQL 16, migrations in `internal/migrations/sql/` (embedded, golang-migrate)
- Run via `pdfforge-cli migrate` or `engine.RunMigrations()`
- Schemas: tenancy, identity, content, organizer

## Logging

- `log/slog` with context-aware handler
- **Always** use `slog.InfoContext(ctx, ...)` not `slog.Info(...)`

## CLI (`cmd/pdfforge-cli/`)

### Command Center

Run without arguments for interactive menu:

```bash
pdfforge-cli
```

Options:

- **Install/Update Project** - detect existing projects, handle conflicts
- **Check System (doctor)** - verify Typst, DB, auth
- **Run Migrations** - apply pending migrations
- **Exit**

### Commands

| Command                       | Description                   |
| ----------------------------- | ----------------------------- |
| `pdfforge-cli`                | Interactive command center    |
| `pdfforge-cli init <name>`    | Scaffold new project          |
| `pdfforge-cli migrate`        | Apply database migrations     |
| `pdfforge-cli doctor`         | Check Typst, DB, schema, auth |
| `pdfforge-cli version`        | Print version info            |
| `pdfforge-cli update`         | Self-update CLI               |
| `pdfforge-cli update --check` | Check for updates only        |

### `init` Flags

| Flag           | Default  | Description               |
| -------------- | -------- | ------------------------- |
| `-m, --module` | `<name>` | Go module name            |
| `--examples`   | `true`   | Include example injectors |
| `--docker`     | `true`   | Include Docker setup      |
| `--git`        | `false`  | Initialize git repository |
| `-y, --yes`    | —        | Non-interactive mode      |

### `doctor` Checks

1. **Typst CLI** - `typst --version`
2. **PostgreSQL** - Connection test
3. **DB Schema** - Checks `tenancy.tenants` table exists
4. **Auth** - JWKS URL configured or dummy mode warning
5. **OS Info** - Platform and architecture

### Project Update Flow

When running Command Center → "Install/Update Project":

**Detection**: Scans for `.pdfforge.lock` file

| Status   | Meaning                       | Options                              |
| -------- | ----------------------------- | ------------------------------------ |
| NEW      | No project found              | Create here / Create in subdirectory |
| EXISTING | Project up-to-date            | Reinstall/Reset                      |
| OUTDATED | Version mismatch in lock file | Update / Skip                        |

**Conflict Resolution** (for modified files):

1. Skip modified files (keep changes)
2. Show diff and decide per-file
3. Backup and overwrite
4. Overwrite all

Backups stored in `.pdfforge-backup/` with timestamp.

## Decision Log

| Decision                             | Rationale                                                   |
| ------------------------------------ | ----------------------------------------------------------- |
| **Typst** (not wkhtmltopdf/Chromium) | No headless browser. Deterministic. Fast CLI. Small binary. |
| **Gin** (not chi/echo)               | Large ecosystem, battle-tested middleware, performance.     |
| **Hexagonal Architecture**           | Clean separation. Swappable adapters. Testable via ports.   |
| **Embedded SPA** (go:embed)          | Single binary deployment. Dev mode proxies to Vite.         |
| **Runtime DI** (not Wire)            | No codegen. Full control over init order.                   |
| **golang-migrate** (not goose/atlas) | Embedded SQL. Simple up/down. Works with go:embed.          |
| **Semaphore concurrency**            | Prevents process explosion. Graceful backpressure.          |

## Documentation

IMPORTANT: Read the relevant doc BEFORE working on that area.

| Doc                                                                            | When to Read                                                                  |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| [docs/glossary.md](docs/glossary.md)                                           | Understanding domain terms (injectable, workspace, tenant, PortableDoc, etc.) |
| [docs/configuration.md](docs/configuration.md)                                 | Changing config, env vars, performance tuning                                 |
| [docs/deployment.md](docs/deployment.md)                                       | Docker, K8s, horizontal scaling, production setup                             |
| [docs/troubleshooting.md](docs/troubleshooting.md)                             | Debugging render failures, auth issues, migrations                            |
| [docs/architecture.md](docs/architecture.md)                                   | Modifying core domain, adding services/usecases/adapters                      |
| [docs/extensibility-guide.md](docs/extensibility-guide.md)                     | Working on injectors, mappers, init functions, SDK extension points           |
| [docs/authorization-matrix.md](docs/authorization-matrix.md)                   | Adding/modifying endpoints, changing role checks, middleware                  |
| [docs/go-best-practices.md](docs/go-best-practices.md)                         | Go code patterns, refactoring, onboarding                                     |
| [docs/logging-guide.md](docs/logging-guide.md)                                 | Adding/modifying logging, context-aware slog                                  |
| [docs/database.md](docs/database.md)                                           | DB schema, migrations, table relationships                                    |
| [apps/web-client/AGENTS.md](apps/web-client/AGENTS.md)                         | React SPA frontend                                                            |
| [apps/web-client/docs/architecture.md](apps/web-client/docs/architecture.md)   | Frontend stack, folder structure                                              |
| [apps/web-client/docs/design_system.md](apps/web-client/docs/design_system.md) | UI components, colors, typography                                             |

## AI Agent Skill

Install the pdf-forge skill for AI-assisted development:

```bash
npx skills add https://github.com/rendis/pdf-forge --skill pdf-forge
```

Supports Claude Code, Cursor, Windsurf, Codex, Gemini.

## Available Skills

| Skill              | When to Use                             |
| ------------------ | --------------------------------------- |
| **pdf-forge**      | Building/extending pdf-forge projects   |
| **feature-dev**    | New features touching multiple layers   |
| **commit**         | Create a git commit                     |
| **commit-push-pr** | Commit, push, and open PR               |
| **code-review**    | Review a PR                             |
| **clean_gone**     | Remove local branches deleted on remote |

**On-Demand Agents**: **code-simplifier** (simplify/refactor code for clarity)

## Common Pitfalls

- Not reading files before suggesting changes
- Using `slog.Info()` instead of `slog.InfoContext(ctx, ...)`
- Forgetting to run `make swagger` after changing API endpoints
- Missing multi-tenant headers (`X-Tenant-ID`, `X-Workspace-ID`) in API calls
- Modifying DB schema SQL directly without understanding migration ordering
- Adding exports to `sdk/types.go` without considering API stability
- Forgetting `internal/` boundary — consumers can only import `sdk/`

## PR Guidelines

1. `make build && make test && make lint`
2. Run `make swagger` if API changed
3. Update README.md if public API or config changed

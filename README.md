# pdf-forge

---

[![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?style=flat&logo=go)](https://go.dev)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Go Reference](https://pkg.go.dev/badge/github.com/rendis/pdf-forge.svg)](https://pkg.go.dev/github.com/rendis/pdf-forge)

Multi-tenant document template builder with on-demand PDF generation, powered by [Typst](https://typst.app).

Build document templates in a visual editor, inject dynamic data through a plugin architecture, and generate PDFs on demand via API.

## Features

- **Visual template editor** -- Rich text editor (TipTap-based) with live preview, conditionals, and injectable placeholders
- **Plugin architecture** -- Write custom injectors to pull data from any source (CRM, database, API)
- **7 value types** -- String, Number, Bool, Time, Table, Image, List with locale-aware formatting
- **Typst rendering** -- Fast, reliable PDF generation with concurrent rendering and image caching
- **Multi-tenant** -- Tenant/workspace isolation with role-based access control (RBAC: system, tenant, and workspace roles)
- **Multi-OIDC** -- Support N OIDC providers; tokens validated by issuer claim matching
- **Embedded frontend** -- Ships with a React SPA; no separate frontend deployment needed
- **Dummy auth mode** -- Start developing immediately without OIDC provider setup
- **CLI scaffolding** -- `pdfforge-cli init myapp` generates a ready-to-run project
- **Dynamic workspace injectables** -- Runtime injectables per workspace via `WorkspaceInjectableProvider`
- **Lifecycle hooks** -- `OnStart()` / `OnShutdown()` for background processes (schedulers, workers)
- **Custom middleware** -- `UseMiddleware()` / `UseAPIMiddleware()` for request processing

## How It Works

```plaintext
Your App                    pdf-forge
┌──────────────┐           ┌─────────────────────────────────────┐
│              │  go get   │  SDK (public API)                   │
│  main.go     │──────────▶│    ├── Engine                       │
│  injectors/  │           │    ├── RegisterInjector()           │
│  mapper.go   │           │    └── Run()                        │
│              │           │                                     │
└──────────────┘           │  Internal                           │
                           │    ├── Template Editor (React SPA)  │
                           │    ├── Injectable Resolver          │
                           │    ├── Typst PDF Renderer           │
                           │    └── PostgreSQL (multi-tenant)    │
                           └─────────────────────────────────────┘
                                         │
                                         ▼
                                    PDF output
```

## Prerequisites

| Dependency | Version | Install                                                                                                                      |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Go         | 1.25+   | [go.dev/dl](https://go.dev/dl/)                                                                                              |
| PostgreSQL | 16+     | `brew install postgresql@16` or Docker                                                                                       |
| Typst      | latest  | `brew install typst` / `cargo install typst-cli` / [typst.app](https://github.com/typst/typst/releases) (included in Docker) |

## Quick Start

### 1. Install the CLI

```bash
go install github.com/rendis/pdf-forge/cmd/pdfforge-cli@latest
```

### 2. Scaffold a project

```bash
pdfforge-cli init myapp
cd myapp
```

This generates:

```plaintext
myapp/
├── main.go                     # Entry point
├── go.mod
├── config/
│   ├── app.yaml                # Server, DB, Typst config
│   └── injectors.i18n.yaml     # Injectable translations
├── extensions/
│   ├── injectors/
│   │   └── example.go          # Example injector
│   ├── mapper.go               # Example request mapper
│   └── init.go                 # Example init function
├── Makefile                    # Common targets (up, run, migrate, etc.)
├── Dockerfile                  # Multi-stage build (Go + Typst)
├── docker-compose.yaml         # App + PostgreSQL (full solution)
└── .env.example
```

### 3. Run

```bash
# Full containerized (app + PostgreSQL) — migrations run automatically
make up

# Or local development (PG in Docker, app on host)
make up-db
make run       # migrations run automatically on startup

# Custom PG port (if 5432 is in use)
PG_PORT=5433 make up
```

The engine starts on `http://localhost:8080`. See [Endpoints](#endpoints) for what's available.

## AI Agent Skill

Install the pdf-forge skill for AI-assisted development:

```bash
npx skills add https://github.com/rendis/pdf-forge --skill pdf-forge
```

## Endpoints

All services run on a single port (`:8080`):

| Route        | Description                                       | Auth                      |
| ------------ | ------------------------------------------------- | ------------------------- |
| `/`          | Template editor (React SPA)                       | None                      |
| `/api/v1/*`  | Public API -- templates, workspaces, render, etc. | Multi-OIDC (JWT) or dummy |
| `/swagger/*` | Swagger UI (enabled via `swagger_ui: true`)       | None                      |
| `/health`    | Health check                                      | None                      |
| `/ready`     | Readiness check                                   | None                      |

**Document Type Render**: `POST /api/v1/workspace/document-types/{code}/render` - Resolves a template by document type code and renders a PDF. Uses same auth as other API routes. No RBAC enforced in controller; add custom authorization via `engine.UseAPIMiddleware()`.

## Roles

Three-level RBAC hierarchy with automatic role elevation:

| Level     | Roles                                            | Scope         |
| --------- | ------------------------------------------------ | ------------- |
| System    | `SUPERADMIN`, `PLATFORM_ADMIN`                   | Platform-wide |
| Tenant    | `TENANT_OWNER`, `TENANT_ADMIN`                   | Per tenant    |
| Workspace | `OWNER`, `ADMIN`, `EDITOR`, `OPERATOR`, `VIEWER` | Per workspace |

**Elevation rules:**

- `SUPERADMIN` → auto `TENANT_OWNER` on any tenant, auto `OWNER` on any workspace
- `TENANT_OWNER` → auto `ADMIN` on workspaces within their tenant

**Workspace role summary:**

| Role     | Can do                                             |
| -------- | -------------------------------------------------- |
| OWNER    | Full workspace control, manage members, archive    |
| ADMIN    | Manage content, publish/archive versions, delete   |
| EDITOR   | Create/edit templates, injectables, folders, tags  |
| OPERATOR | Generate PDFs from published templates (read-only) |
| VIEWER   | Read-only access                                   |

See [Authorization Matrix](docs/authorization-matrix.md) for full endpoint permissions.

## Minimal Example

```go
package main

import (
    "log"
    "github.com/rendis/pdf-forge/sdk"
)

func main() {
    engine := sdk.New(
        sdk.WithConfigFile("config/app.yaml"),
    )
    if err := engine.Run(); err != nil {
        log.Fatal(err)
    }
}
```

## Full Example

```go
package main

import (
    "context"
    "log"
    "log/slog"
    "github.com/rendis/pdf-forge/sdk"
)

func main() {
    engine := sdk.New(
        sdk.WithConfigFile("config/app.yaml"),
        sdk.WithI18nFile("config/injectors.i18n.yaml"),
    )

    // Register extensions via helper functions (keeps main clean)
    registerInjectors(engine)
    registerMiddleware(engine)
    registerLifecycle(engine)

    // Set request mapper (parses incoming render requests)
    engine.SetMapper(&MyMapper{})

    // Set init function (runs before injectors per request, loads shared data)
    engine.SetInitFunc(myInitFunc)

    // Optional: workspace injectable provider (dynamic per-workspace injectables)
    engine.SetWorkspaceInjectableProvider(&MyProvider{})

    if err := engine.Run(); err != nil {
        log.Fatal(err)
    }
}

func registerInjectors(engine *sdk.Engine) {
    engine.RegisterInjector(&CustomerNameInjector{})
    engine.RegisterInjector(&InvoiceTotalInjector{})
    engine.RegisterInjector(&ItemsTableInjector{})
}

func registerMiddleware(engine *sdk.Engine) {
    engine.UseMiddleware(myLoggerMiddleware())
    engine.UseAPIMiddleware(myTenantValidation())
}

func registerLifecycle(engine *sdk.Engine) {
    var cancel context.CancelFunc
    var done chan struct{}

    engine.OnStart(func(ctx context.Context) error {
        // Start background processes in goroutine (hooks are sync!)
        var bgCtx context.Context
        bgCtx, cancel = context.WithCancel(context.Background())
        done = make(chan struct{})
        go func() {
            defer close(done)
            // myScheduler.Run(bgCtx)
            slog.InfoContext(bgCtx, "background process running")
            <-bgCtx.Done()
        }()
        return nil
    })

    engine.OnShutdown(func(ctx context.Context) error {
        if cancel != nil {
            cancel()
            <-done // Wait for clean exit
        }
        return nil
    })
}
```

## Writing Injectors

An injector provides dynamic values for template placeholders. Implement the `sdk.Injector` interface:

```go
package injectors

import (
    "context"
    "time"

    "github.com/rendis/pdf-forge/sdk"
)

type CustomerNameInjector struct{}

func (i *CustomerNameInjector) Code() string { return "customer_name" }

func (i *CustomerNameInjector) DataType() sdk.ValueType { return sdk.ValueTypeString }

func (i *CustomerNameInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        // Access parsed request payload
        payload := injCtx.RequestPayload().(*MyPayload)

        return &sdk.InjectorResult{
            Value: sdk.StringValue(payload.CustomerName),
        }, nil
    }, nil // no dependencies
}

func (i *CustomerNameInjector) IsCritical() bool            { return true }
func (i *CustomerNameInjector) Timeout() time.Duration      { return 5 * time.Second }
func (i *CustomerNameInjector) DefaultValue() *sdk.InjectableValue { return nil }
func (i *CustomerNameInjector) Formats() *sdk.FormatConfig  { return nil }
```

### Injector with Dependencies

Injectors can depend on other injectors. Dependencies are resolved first, and their values are accessible via `injCtx.GetResolved()`:

```go
func (i *DiscountInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        // Read a previously resolved injector's value
        totalRaw, _ := injCtx.GetResolved("invoice_total")
        total := totalRaw.(float64)

        discount := total * 0.10
        return &sdk.InjectorResult{Value: sdk.NumberValue(discount)}, nil
    }, []string{"invoice_total"} // depends on invoice_total
}
```

### Injector with Format Options

Provide selectable format options that appear in the template editor:

```go
func (i *InvoiceDateInjector) DataType() sdk.ValueType { return sdk.ValueTypeTime }

func (i *InvoiceDateInjector) Formats() *sdk.FormatConfig {
    return &sdk.FormatConfig{
        Default: "DD/MM/YYYY",
        Options: []string{"DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "D MMMM YYYY"},
    }
}
```

## Writing a Request Mapper

The mapper parses incoming render request bodies into a typed payload accessible by injectors:

```go
type MyMapper struct{}

func (m *MyMapper) Map(ctx context.Context, mapCtx *sdk.MapperContext) (any, error) {
    var payload MyPayload
    if err := json.Unmarshal(mapCtx.RawBody, &payload); err != nil {
        return nil, err
    }
    return &payload, nil
}
```

`MapperContext` fields:

- `RawBody` -- unparsed HTTP request body
- `Headers` -- HTTP headers
- `ExternalID`, `TemplateID`, `TransactionalID`, `Operation` -- request metadata

## Writing an Init Function

The init function runs once before all injectors on each render request. Use it to load shared data (DB connections, API clients):

```go
func myInitFunc(ctx context.Context, injCtx *sdk.InjectorContext) (any, error) {
    payload := injCtx.RequestPayload().(*MyPayload)

    // Load data that multiple injectors need
    customer, err := db.GetCustomer(ctx, payload.CustomerID)
    if err != nil {
        return nil, err
    }

    return &SharedData{Customer: customer}, nil
}
```

Access in injectors via `injCtx.InitData().(*SharedData)`.

## Writing a Workspace Injectable Provider

For dynamic injectables that vary per workspace and are defined at runtime (not at startup), implement `sdk.WorkspaceInjectableProvider`. Use this when:

- Different workspaces have different available injectables
- Injectables are fetched from external systems at runtime
- You can't know all injectables at startup

```go
type MyProvider struct{}

func (p *MyProvider) GetInjectables(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.GetInjectablesResult, error) {
    // injCtx.TenantCode(), injCtx.WorkspaceCode() identify the workspace
    // Return all locales - framework picks based on request

    return &sdk.GetInjectablesResult{
        Injectables: []sdk.ProviderInjectable{
            {
                Code:        "customer_name",
                Label:       map[string]string{"es": "Nombre", "en": "Customer Name"},
                Description: map[string]string{"es": "Nombre del cliente", "en": "Full name of the customer"},
                DataType:    sdk.InjectableDataTypeText,
                GroupKey:    "custom_data",
            },
        },
        Groups: []sdk.ProviderGroup{
            {Key: "custom_data", Name: map[string]string{"es": "Datos", "en": "Custom Data"}, Icon: "user"},
        },
    }, nil
}

func (p *MyProvider) ResolveInjectables(ctx context.Context, req *sdk.ResolveInjectablesRequest) (*sdk.ResolveInjectablesResult, error) {
    // req.Codes contains the injectable codes to resolve
    // req.Headers, req.Payload, req.InitData available for context

    values := make(map[string]*sdk.InjectableValue)
    for _, code := range req.Codes {
        val := sdk.StringValue("resolved value")
        values[code] = &val
    }
    return &sdk.ResolveInjectablesResult{Values: values}, nil
}
```

Register via:

```go
engine.SetWorkspaceInjectableProvider(&MyProvider{})
```

**Key points:**

- **i18n**: Provider handles translations internally; return pre-translated `Label`, `Description`, and group `Name`
- **Error handling**: Return `(nil, error)` for critical failures that stop render; use `result.Errors` map for non-critical failures
- **Code collisions**: Provider codes must not conflict with registry injector codes (error on collision)
- **Groups**: Provider can define custom groups that merge with YAML-defined groups

## Value Types

| Type   | Constant              | Constructor                     | Example               |
| ------ | --------------------- | ------------------------------- | --------------------- |
| String | `sdk.ValueTypeString` | `sdk.StringValue("hello")`      | Text, names           |
| Number | `sdk.ValueTypeNumber` | `sdk.NumberValue(1234.56)`      | Amounts, quantities   |
| Bool   | `sdk.ValueTypeBool`   | `sdk.BoolValue(true)`           | Flags, toggles        |
| Time   | `sdk.ValueTypeTime`   | `sdk.TimeValue(time.Now())`     | Dates, timestamps     |
| Table  | `sdk.ValueTypeTable`  | `sdk.TableValueData(table)`     | Dynamic tables        |
| Image  | `sdk.ValueTypeImage`  | `sdk.ImageValue("https://...")` | Logos, signatures     |
| List   | `sdk.ValueTypeList`   | `sdk.ListValueData(list)`       | Bullet/numbered lists |

### Table Example

```go
table := sdk.NewTableValue().
    AddColumn("product", map[string]string{"en": "Product", "es": "Producto"}, sdk.ValueTypeString).
    AddColumnWithFormat("price", map[string]string{"en": "Price", "es": "Precio"}, sdk.ValueTypeNumber, "$#,##0.00").
    AddRow(
        sdk.Cell(sdk.StringValue("Widget A")),
        sdk.Cell(sdk.NumberValue(29.99)),
    ).
    AddRow(
        sdk.Cell(sdk.StringValue("Widget B")),
        sdk.Cell(sdk.NumberValue(49.99)),
    ).
    WithHeaderStyles(sdk.TableStyles{
        Background: sdk.StringPtr("#1a1a2e"),
        TextColor:  sdk.StringPtr("#ffffff"),
        FontWeight: sdk.StringPtr("bold"),
    })

return &sdk.InjectorResult{Value: sdk.TableValueData(table)}, nil
```

### List Example

```go
list := sdk.NewListValue().
    WithSymbol(sdk.ListSymbolNumber).
    WithHeaderLabel(map[string]string{"en": "Requirements", "es": "Requisitos"}).
    AddItem(sdk.StringValue("Valid ID")).
    AddItem(sdk.StringValue("Proof of address")).
    AddNestedItem(sdk.StringValue("Financial documents"),
        sdk.ListItemValue(sdk.StringValue("Last 3 pay stubs")),
        sdk.ListItemValue(sdk.StringValue("Bank statements")),
    )

return &sdk.InjectorResult{Value: sdk.ListValueData(list)}, nil
```

**List symbols**: `ListSymbolBullet` (default), `ListSymbolNumber`, `ListSymbolDash`, `ListSymbolRoman`, `ListSymbolLetter`

## Format Presets

Built-in format presets available for `FormatConfig`:

| Category    | Default            | Options                                                  |
| ----------- | ------------------ | -------------------------------------------------------- |
| Date        | `DD/MM/YYYY`       | `MM/DD/YYYY`, `YYYY-MM-DD`, `D MMMM YYYY`, `DD MMM YYYY` |
| Time        | `HH:mm`            | `HH:mm:ss`, `hh:mm a`, `hh:mm:ss a`                      |
| DateTime    | `DD/MM/YYYY HH:mm` | `YYYY-MM-DD HH:mm:ss`, `D MMMM YYYY, HH:mm`              |
| Number      | `#,##0.00`         | `#,##0`, `#,##0.000`, `0.00`                             |
| Currency    | `$#,##0.00`        | `€#,##0.00`, `#,##0.00 USD`                              |
| Percentage  | `#,##0.00%`        | `#,##0%`, `#,##0.0%`                                     |
| Phone       | `+## # #### ####`  | `(###) ###-####`, `### ### ####`                         |
| Boolean     | `Yes/No`           | `True/False`, `Sí/No`                                    |
| RUT (Chile) | `##.###.###-#`     | `########-#`                                             |

## Docker

The scaffold generates a `Makefile`, `Dockerfile` and `docker-compose.yaml` that packages the full solution by default:

```bash
make up                    # App + PostgreSQL (default)
make up-db                 # Only PostgreSQL (for local dev)
make down                  # Stop all containers
make logs                  # Tail container logs
make clean                 # Stop + remove volumes
make migrate               # Apply database migrations
make run                   # Build and run locally
make dev                   # Hot reload (requires air)
make test                  # Run tests
make fmt                   # Format code
make lint                  # Run linter
make help                  # Show all targets
```

Custom PG port: `PG_PORT=5433 make up`

### Using an External PostgreSQL

Set connection details via `.env` file or environment variables, then exclude the bundled PG:

```bash
# .env
DOC_ENGINE_DATABASE_HOST=my-rds.amazonaws.com
DOC_ENGINE_DATABASE_PORT=5432
DOC_ENGINE_DATABASE_USER=myuser
DOC_ENGINE_DATABASE_PASSWORD=mypassword
DOC_ENGINE_DATABASE_NAME=pdf_forge
```

```bash
docker compose up --build --scale postgres=0
```

All `DOC_ENGINE_DATABASE_*` variables default to the bundled PostgreSQL container values, so no `.env` is needed when using the bundled PG.

### Custom PostgreSQL Port

If port 5432 is already in use, change the host-side port with `PG_PORT`:

```bash
# Containerized
PG_PORT=5433 make up

# Local development
PG_PORT=5433 make up-db
DOC_ENGINE_DATABASE_PORT=5433 make migrate
DOC_ENGINE_DATABASE_PORT=5433 make run
```

Or set `PG_PORT=5433` in your `.env` file to make it permanent.

### Dockerfile

The `Dockerfile` is a multi-stage build that:

1. Compiles your Go app in `golang:1.25-alpine`
2. Installs Typst CLI in `alpine:3.21` (auto-detects x86_64/aarch64)
3. Copies config and binary into a minimal runtime image

## Configuration

Configuration is loaded from a YAML file. Environment variables with `DOC_ENGINE_` prefix override YAML values.

```yaml
# config/app.yaml
server:
  port: "8080"
  read_timeout: 30
  write_timeout: 30

database:
  host: localhost # DOC_ENGINE_DATABASE_HOST
  port: 5432 # DOC_ENGINE_DATABASE_PORT
  user: postgres # DOC_ENGINE_DATABASE_USER
  password: "" # DOC_ENGINE_DATABASE_PASSWORD
  name: pdf_forge # DOC_ENGINE_DATABASE_NAME
  ssl_mode: disable
  max_pool_size: 10

# OIDC auth (empty = dummy mode)
# auth:
#   panel:
#     name: "web-panel"
#     issuer: "https://auth.example.com/realms/web"
#     jwks_url: "https://auth.example.com/realms/web/.../certs"
#     audience: "pdf-forge-web"

typst:
  bin_path: typst
  timeout_seconds: 10
  max_concurrent: 20 # Max simultaneous renders
  font_dirs: [] # Additional font directories
  image_cache_dir: "" # Empty = temp per request

logging:
  level: info # debug, info, warn, error
  format: json # json, text
```

### Engine Options

```go
sdk.New(
    sdk.WithConfigFile("config/app.yaml"),     // Load from YAML
    sdk.WithConfig(cfg),                        // Or provide programmatically
    sdk.WithI18nFile("config/i18n.yaml"),       // Injectable translations
    sdk.WithDevFrontendURL("http://localhost:5173"), // Proxy to React dev server
)
```

## Authentication

pdf-forge uses standard **OIDC/JWKS** for authentication. Supports **multiple OIDC providers** — tokens are validated against the provider matching the token's `iss` claim.

### Dummy Mode (Development)

When `auth` is not configured, dummy mode auto-enables:

- Admin user seeded (`admin@pdfforge.local`)
- No tokens required for API requests
- No OIDC provider needed

### Production Mode

Configure OIDC providers in `config/app.yaml`:

```yaml
auth:
  # Panel: OIDC for web UI login and management endpoints
  panel:
    name: "web-panel"
    issuer: "https://auth.example.com/realms/web"
    jwks_url: "https://auth.example.com/realms/web/protocol/openid-connect/certs"
    audience: "pdf-forge-web" # optional

  # Render providers: Additional OIDC ONLY for render endpoints
  render_providers:
    - name: "internal-services"
      issuer: "https://auth.example.com/realms/services"
      jwks_url: "https://auth.example.com/realms/services/protocol/openid-connect/certs"
```

**How it works**: Token's `iss` claim is matched against panel or render providers. Unknown issuer → 401.

The backend validates JWTs using standard claims (`sub`, `email`, `name`) and RS256/384/512 signatures.

#### Frontend Configuration

The embedded frontend uses Direct Access Grant (Resource Owner Password) flow with explicit OIDC endpoint URLs. Configure via environment variables **before building** the frontend:

```bash
VITE_OIDC_TOKEN_URL=https://your-auth-server/token-endpoint
VITE_OIDC_USERINFO_URL=https://your-auth-server/userinfo-endpoint
VITE_OIDC_LOGOUT_URL=https://your-auth-server/logout-endpoint
VITE_OIDC_CLIENT_ID=your-client-id
```

> The frontend is provider-agnostic — just provide the full OIDC endpoint URLs for your provider.

#### Supported Providers

The backend (JWKS validation) works with any OIDC-compliant provider:

| Provider    | JWKS URL                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------- |
| Keycloak    | `https://{host}/realms/{realm}/protocol/openid-connect/certs`                               |
| Auth0       | `https://{domain}/.well-known/jwks.json`                                                    |
| AWS Cognito | `https://cognito-idp.{region}.amazonaws.com/{poolId}/.well-known/jwks.json`                 |
| Azure AD    | `https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys`                            |
| Okta        | `https://{domain}/oauth2/default/v1/keys`                                                   |
| Firebase    | `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com` |

> Both backend and frontend work with all providers above. The frontend accepts explicit endpoint URLs — no provider-specific code required.

## CLI Reference

### Interactive Mode

```bash
pdfforge-cli              # Opens command center
```

### Commands

```bash
pdfforge-cli init <name>     # Scaffold a new project
pdfforge-cli init <name> -y  # Non-interactive with defaults
pdfforge-cli migrate         # Apply database migrations
pdfforge-cli doctor          # Check prerequisites
pdfforge-cli version         # Print version
pdfforge-cli update          # Self-update CLI
```

### Doctor Output

`pdfforge-cli doctor` validates:

1. Typst CLI is installed and executable
2. Database is reachable
3. Schema is initialized (migrations applied)
4. Auth configuration is valid

## Programmatic Migrations

```go
// Via engine instance
engine := sdk.New(sdk.WithConfigFile("config/app.yaml"))
if err := engine.RunMigrations(); err != nil {
    log.Fatal(err)
}

// Standalone
if err := sdk.RunMigrations("config/app.yaml"); err != nil {
    log.Fatal(err)
}
```

## Injectable Translations (i18n)

Define names and descriptions for your injectors in the template editor:

```yaml
# config/injectors.i18n.yaml
groups:
  - key: billing
    name:
      en: "Billing"
      es: "Facturación"
    icon: "receipt"

customer_name:
  group: billing
  name:
    en: "Customer Name"
    es: "Nombre del Cliente"
  description:
    en: "Full name of the customer"
    es: "Nombre completo del cliente"
```

## Project Structure

```plaintext
your-app/
├── main.go                    # Engine setup + extensions
├── config/
│   ├── app.yaml               # Configuration
│   └── injectors.i18n.yaml    # Injectable translations
├── extensions/
│   ├── injectors/             # Custom injectors
│   ├── mapper.go              # Request mapper
│   └── init.go                # Init function
├── Makefile                   # Common targets (up, run, migrate, etc.)
├── Dockerfile                 # Multi-stage build (Go + Typst)
├── docker-compose.yaml        # App + PostgreSQL (full solution)
└── go.mod
```

Library internals (not part of your project):

```plaintext
github.com/rendis/pdf-forge/
├── sdk/                       # Public API (Engine, types, options)
├── cmd/
│   ├── api/                   # Standalone server binary
│   └── pdfforge-cli/          # CLI tool (init, migrate, doctor)
├── skills/
│   └── pdf-forge/             # AI agent skill (install via npx skills add)
├── internal/                  # All implementation (not importable)
│   ├── core/                  # Domain: entities, ports, services
│   ├── adapters/              # HTTP controllers, PostgreSQL repos
│   ├── extensions/            # Built-in injectors (datetime)
│   ├── infra/                 # Config, logging, server
│   ├── migrations/            # Embedded SQL migrations
│   └── frontend/              # Embedded React SPA
├── examples/quickstart/       # Reference project
└── settings/                  # Config templates
```

## Documentation

| Document                                             | Description                                                      |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| [Architecture](docs/architecture.md)                 | Hexagonal architecture, domain organization, directory structure |
| [Extensibility Guide](docs/extensibility-guide.md)   | Writing custom injectors, mappers, and init functions            |
| [Authorization Matrix](docs/authorization-matrix.md) | RBAC roles, endpoint permissions, multi-tenant headers           |
| [Go Best Practices](docs/go-best-practices.md)       | Go coding patterns and conventions                               |
| [Logging Guide](docs/logging-guide.md)               | Context-aware logging with slog                                  |
| [Database Schema](db/database.md)                    | Multi-tenant DB model, ER diagrams, table reference              |

## Development

```bash
make build              # Build binary
make run                # Build and run
make test               # Unit tests
make lint               # Run linter
make fmt                # Format code
make swagger            # Regenerate OpenAPI spec
make dev                # Hot reload with air
```

## Built-in Injectors

pdf-forge ships with datetime injectors out of the box:

| Code            | Description           | Format Options                           |
| --------------- | --------------------- | ---------------------------------------- |
| `date_now`      | Current date          | DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, long |
| `time_now`      | Current time          | HH:mm, HH:mm:ss, hh:mm a                 |
| `date_time_now` | Current date and time | DD/MM/YYYY HH:mm, YYYY-MM-DD HH:mm:ss    |
| `year_now`      | Current year          | --                                       |
| `month_now`     | Current month name    | --                                       |
| `day_now`       | Current day of month  | --                                       |

## License

[MIT](LICENSE)

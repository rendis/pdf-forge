---
name: pdf-forge
description: Use when building, extending or using pdf-forge multi-tenant PDF template engine with Typst
---

# pdf-forge

Go module for multi-tenant document templates with PDF generation via Typst.

## Installation

```bash
npx skills add https://github.com/rendis/pdf-forge --skill pdf-forge
```

Supports Claude Code, Cursor, Windsurf, Codex, Gemini.

## How It Works

```plaintext
Tenant → Workspace → Template → Version (DRAFT→PUBLISHED)
                                    ↓
                              Injectables (variables)
                                    ↓
                              Render → PDF
```

## Quick Start (main.go)

```go
package main

import (
    "log"
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

    engine.SetMapper(&MyMapper{})
    engine.SetInitFunc(MyInit())
    engine.SetWorkspaceInjectableProvider(&MyProvider{})

    // Run
    if err := engine.RunMigrations(); err != nil {
        log.Fatal("migrations: ", err)
    }
    if err := engine.Run(); err != nil {
        log.Fatal(err)
    }
}

func registerInjectors(engine *sdk.Engine) {
    engine.RegisterInjector(&CustomerNameInjector{})
    // Add more injectors here...
}

func registerMiddleware(engine *sdk.Engine) {
    engine.UseMiddleware(myLoggerMiddleware())
    engine.UseAPIMiddleware(myTenantValidation())
}

func registerLifecycle(engine *sdk.Engine) {
    engine.OnStart(func(ctx context.Context) error { return nil })
    engine.OnShutdown(func(ctx context.Context) error { return nil })
}
```

## Creating an Injector

Injectors produce values for template variables. Implement the `sdk.Injector` interface:

```go
type CustomerNameInjector struct{}

func (i *CustomerNameInjector) Code() string { return "customer_name" }

func (i *CustomerNameInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        // Access request data from mapper
        payload := injCtx.RequestPayload().(map[string]any)
        name := payload["customer_name"].(string)

        return &sdk.InjectorResult{Value: sdk.StringValue(name)}, nil
    }, nil  // no dependencies
}

func (i *CustomerNameInjector) IsCritical() bool                  { return true }
func (i *CustomerNameInjector) Timeout() time.Duration             { return 5 * time.Second }
func (i *CustomerNameInjector) DataType() sdk.ValueType            { return sdk.ValueTypeString }
func (i *CustomerNameInjector) DefaultValue() *sdk.InjectableValue { return nil }
func (i *CustomerNameInjector) Formats() *sdk.FormatConfig         { return nil }
```

**Register**: `engine.RegisterInjector(&CustomerNameInjector{})`

## Value Types

| Need      | Constructor             | Type Constant         |
| --------- | ----------------------- | --------------------- |
| Text      | `sdk.StringValue(s)`    | `sdk.ValueTypeString` |
| Number    | `sdk.NumberValue(n)`    | `sdk.ValueTypeNumber` |
| Boolean   | `sdk.BoolValue(b)`      | `sdk.ValueTypeBool`   |
| Date/Time | `sdk.TimeValue(t)`      | `sdk.ValueTypeTime`   |
| Image     | `sdk.ImageValue(url)`   | `sdk.ValueTypeImage`  |
| Table     | `sdk.TableValueData(t)` | `sdk.ValueTypeTable`  |
| List      | `sdk.ListValueData(l)`  | `sdk.ValueTypeList`   |

See **types-reference.md** for Tables and Lists API.

## Injector with Dependencies

Injectors can depend on other injectors. Dependencies resolve first (topological order):

```go
func (i *TotalInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        price, _ := injCtx.GetResolved("unit_price")
        qty, _ := injCtx.GetResolved("quantity")
        total := price.(float64) * qty.(float64)
        return &sdk.InjectorResult{Value: sdk.NumberValue(total)}, nil
    }, []string{"unit_price", "quantity"}  // <- dependencies here
}
```

## Format Options

Injectors can offer format options (dates, numbers, etc.):

```go
func (i *InvoiceDateInjector) Formats() *sdk.FormatConfig {
    return &sdk.FormatConfig{
        Default: "DD/MM/YYYY",
        Options: []string{"DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "D MMMM YYYY"},
    }
}
```

User selects format in editor. Access selected format:

```go
format := injCtx.SelectedFormat("invoice_date")  // returns selected option
```

See **types-reference.md** for format presets.

## i18n (Translations)

Define injectable labels in `config/injectors.i18n.yaml`:

```yaml
customer_name:
  name:
    en: "Customer Name"
    es: "Nombre del Cliente"
  description:
    en: "Full customer name"
    es: "Nombre completo del cliente"

# Group definition
groups:
  - key: billing
    name:
      en: "Billing"
      es: "Facturación"
    icon: "receipt"
```

## Built-in Injectors

Available without registration:

| Code            | Type   | Formats                                  |
| --------------- | ------ | ---------------------------------------- |
| `date_now`      | TIME   | DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, long |
| `time_now`      | TIME   | HH:mm, HH:mm:ss, hh:mm a                 |
| `date_time_now` | TIME   | Combined date+time                       |
| `year_now`      | NUMBER | -                                        |
| `month_now`     | NUMBER | number, name, short_name                 |
| `day_now`       | NUMBER | -                                        |

## Error Handling

| `IsCritical()` | On Error                                     |
| -------------- | -------------------------------------------- |
| `true`         | Aborts render, returns error                 |
| `false`        | Logs error, uses `DefaultValue()`, continues |

**Best practice**: Critical injectors should either handle errors gracefully or have a sensible `DefaultValue()`.

## InjectorContext Methods

Available in `Resolve()` function:

```go
// Request identification
injCtx.ExternalID()           // External request ID
injCtx.TemplateID()           // Template being rendered
injCtx.TransactionalID()      // Traceability ID

// Multi-tenant context
injCtx.TenantCode()           // Tenant code
injCtx.WorkspaceCode()        // Workspace code

// Data access
injCtx.GetResolved("code")    // Get dependency value (any, bool)
injCtx.RequestPayload()       // Data from RequestMapper (any)
injCtx.InitData()             // Data from InitFunc (any)
injCtx.SelectedFormat("code") // User-selected format (string)
injCtx.Header("X-Custom")     // HTTP header value
```

## RequestMapper

Parses HTTP request body for injectors:

```go
type MyMapper struct{}

func (m *MyMapper) Map(ctx context.Context, mapCtx *sdk.MapperContext) (any, error) {
    var payload map[string]any
    if err := json.Unmarshal(mapCtx.RawBody, &payload); err != nil {
        return nil, err
    }
    return payload, nil
}
```

**Register**: `engine.SetMapper(&MyMapper{})`

Access in injector: `injCtx.RequestPayload().(map[string]any)`

## InitFunc

Runs once before all injectors. Use for shared setup (DB queries, API calls):

```go
func MyInit() sdk.InitFunc {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (any, error) {
        // Load shared data
        customer, err := loadCustomer(injCtx.ExternalID())
        if err != nil {
            return nil, err
        }
        return customer, nil
    }
}
```

**Register**: `engine.SetInitFunc(MyInit())`

Access in injector: `injCtx.InitData().(*Customer)`

## WorkspaceInjectableProvider

For dynamic, workspace-specific injectables (e.g., from CRM, external APIs):

```go
type MyProvider struct{}

func (p *MyProvider) GetInjectables(ctx context.Context, req *sdk.GetInjectablesRequest) (*sdk.GetInjectablesResult, error) {
    // Called when editor opens - return ALL locales (framework picks based on request)
    return &sdk.GetInjectablesResult{
        Injectables: []sdk.ProviderInjectable{
            {
                Code: "crm_customer_name",
                Label: map[string]string{
                    "es": "Nombre del Cliente",
                    "en": "Customer Name",
                },
                Description: map[string]string{
                    "es": "Nombre desde CRM",
                    "en": "Name from CRM",
                },
                DataType: sdk.ValueTypeString,
                GroupKey: "crm_data",
            },
        },
        Groups: []sdk.ProviderGroup{
            {
                Key: "crm_data",
                Name: map[string]string{
                    "es": "Datos CRM",
                    "en": "CRM Data",
                },
                Icon: "database",
            },
        },
    }, nil
}

func (p *MyProvider) ResolveInjectables(ctx context.Context, req *sdk.ResolveInjectablesRequest) (*sdk.ResolveInjectablesResult, error) {
    // Called during render - resolve values
    values := make(map[string]*sdk.InjectableValue)
    for _, code := range req.Codes {
        if code == "crm_customer_name" {
            val := sdk.StringValue("John Doe")
            values[code] = &val
        }
    }
    return &sdk.ResolveInjectablesResult{Values: values}, nil
}
```

**Register**: `engine.SetWorkspaceInjectableProvider(&MyProvider{})`

**i18n**: Return all locales in `map[string]string`. Framework picks based on `?locale=` param. Fallback: requested → "en" → code.

See **types-reference.md** for complete interface.

## CLI Commands

```bash
pdfforge-cli              # Interactive menu
pdfforge-cli init <name>  # Create new project
pdfforge-cli doctor       # Check Typst, DB, auth
pdfforge-cli migrate      # Run database migrations
pdfforge-cli version      # Show version
pdfforge-cli update       # Self-update CLI
```

## Common Mistakes

| Wrong                                      | Correct                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `sdk.NewTextValue()`                       | `sdk.StringValue()`                                                         |
| `sdk.ValueTypeText`                        | `sdk.ValueTypeString`                                                       |
| `sdk.NewNumberValue()`                     | `sdk.NumberValue()`                                                         |
| Forgetting dependencies in Resolve()       | Return deps in second value: `return fn, []string{"dep1"}`                  |
| `IsCritical()=true` without error handling | Either handle errors or provide `DefaultValue()`                            |
| Workspace injectable with non-TEXT type    | Only TEXT allowed via UI; use WorkspaceInjectableProvider for complex types |

## Project Structure

```plaintext
my-project/
  main.go                 # Entry point, register extensions
  config/
    app.yaml              # Server, DB, auth config
    injectors.i18n.yaml   # Injectable translations
  extensions/
    init.go               # InitFunc
    mapper.go             # RequestMapper
    provider.go           # WorkspaceInjectableProvider
    injectors/            # Custom Injector implementations
```

## Configuration (app.yaml)

```yaml
server:
  port: 8080
database:
  host: localhost
  port: 5432
  name: pdfforge
auth:
  jwks_url: "" # Empty = dummy auth mode
typst:
  bin_path: typst
  max_concurrent: 20
internal_api:
  api_key: "your-secret-key"
```

## Dummy Auth Mode (Development)

For local development without JWT/JWKS setup:

**Enable**: Leave `auth.jwks_url` empty in `config/app.yaml`

```yaml
auth:
  jwks_url: "" # Empty = dummy mode
```

**What happens**:

- Auto-seeds SUPERADMIN user: `admin@pdfforge.local`
- Skips JWT validation on all `/api/v1/*` routes
- `Authorization` header not required
- Full admin access to all tenants/workspaces
- Warning logged: `"⚠ auth not configured — running in dummy mode (dev only)"`

**Headers still required** (for tenant/workspace scoped routes):

- `X-Tenant-ID`: UUID
- `X-Workspace-ID`: UUID

**Example request** (no auth needed):

```bash
curl -X GET http://localhost:8080/api/v1/templates \
  -H "X-Tenant-ID: <tenant-uuid>" \
  -H "X-Workspace-ID: <workspace-uuid>"
```

**Warning**: Dev only. Never use in production.

## Custom Middleware

Add middleware to customize request handling.

**Global** (all routes - after CORS, before auth):

```go
engine.UseMiddleware(func(c *gin.Context) {
    // Runs on ALL routes (health, swagger, api, internal)
    start := time.Now()
    c.Next()
    slog.InfoContext(c.Request.Context(), "request",
        slog.Duration("latency", time.Since(start)))
})
```

**API only** (`/api/v1/*` - after auth, before controllers):

```go
engine.UseAPIMiddleware(func(c *gin.Context) {
    // Runs after auth - user context available:
    // c.Get("user_id"), c.Get("tenant_id"), c.Get("workspace_id")
    c.Next()
})
```

**Execution order**:

```plaintext
Global: Recovery → Logger → CORS → [User Global] → Routes
API:    Operation → Auth → Identity → Roles → [User API] → Controller
```

See **enterprise-scenarios.md** Scenario F for complete examples.

## Lifecycle Hooks

Register code to run at startup and shutdown.

**OnStart** (after config/preflight, before HTTP server):

```go
engine.OnStart(func(ctx context.Context) error {
    slog.InfoContext(ctx, "app starting")
    return nil
})
```

**OnShutdown** (after HTTP stops, before exit):

```go
engine.OnShutdown(func(ctx context.Context) error {
    slog.InfoContext(ctx, "app stopping")
    return nil
})
```

### Background Processes Pattern

Both hooks are **synchronous**. For background processes (schedulers, workers), spawn a goroutine:

```go
var (
    schedulerCtx    context.Context
    schedulerCancel context.CancelFunc
    schedulerDone   chan struct{}
)

engine.OnStart(func(ctx context.Context) error {
    schedulerCtx, schedulerCancel = context.WithCancel(context.Background())
    schedulerDone = make(chan struct{})

    go func() {
        defer close(schedulerDone)
        myScheduler.Run(schedulerCtx)  // blocking call in goroutine
    }()

    return nil  // return immediately
})

engine.OnShutdown(func(ctx context.Context) error {
    schedulerCancel()    // signal scheduler to stop
    <-schedulerDone      // wait for clean exit
    return nil
})
```

### Anti-Pattern

```go
// ❌ WRONG: Blocking call in OnStart - server never starts!
engine.OnStart(func(ctx context.Context) error {
    myScheduler.Run(ctx)  // blocks forever
    return nil
})
```

## What's NOT Supported

pdf-forge is a configured engine, not a plugin system. These are **NOT extensible**:

| Feature              | Status  | Alternative                              |
| -------------------- | ------- | ---------------------------------------- |
| Custom middleware    | ✅      | `UseMiddleware()`, `UseAPIMiddleware()`  |
| Lifecycle hooks      | ✅      | `OnStart()`, `OnShutdown()`              |
| Custom HTTP routes   | ❌      | Deploy separate service                  |
| Auth providers       | ❌      | Config `auth.jwks_url` only              |
| Database hooks       | ❌      | Use `InitFunc` for pre-load              |
| Custom env prefix    | ❌      | Use `DOC_ENGINE_*` (hardcoded)           |
| Request interception | Partial | `SetMapper()` (render only) + middleware |
| Custom log handlers  | ❌      | Config `logging.level`/`format` only     |

**Extension Points Available:**

- `RegisterInjector()` - custom data resolvers (multiple)
- `SetMapper()` - custom request parsing for render (one)
- `SetInitFunc()` - shared setup before injectors per request
- `SetWorkspaceInjectableProvider()` - dynamic workspace injectables
- `UseMiddleware()` / `UseAPIMiddleware()` - HTTP middleware
- `OnStart()` / `OnShutdown()` - lifecycle hooks

See **enterprise-scenarios.md** for workarounds and patterns.

## API Headers

| Header           | Purpose                            |
| ---------------- | ---------------------------------- |
| `Authorization`  | `Bearer <JWT>`                     |
| `X-Tenant-ID`    | Tenant UUID                        |
| `X-Workspace-ID` | Workspace UUID                     |
| `X-API-Key`      | Service-to-service (`/internal/*`) |

## References

- **config-reference.md** - Environment variables, YAML keys, performance tuning
- **patterns-reference.md** - Logging, error handling, context, concurrency, anti-patterns
- **enterprise-scenarios.md** - Complete integration examples (CRM, Vault, validation)
- **types-reference.md** - Tables API, Lists API, FormatConfig presets
- **domain-reference.md** - Tenants, workspaces, roles, version states, render flow
- **scripts-reference.md** - Custom scripts system (`make run-script`)

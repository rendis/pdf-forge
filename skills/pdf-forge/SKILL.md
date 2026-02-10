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

## How It Works

```plaintext
Tenant → Workspace → Template → Version (DRAFT→PUBLISHED)
                                    ↓
                              Injectables (variables)
                                    ↓
                              Render → PDF
```

## Quick Start

```go
// core/extensions/register.go
func Register(engine *sdk.Engine) {
    engine.RegisterInjector(&CustomerNameInjector{})
    engine.SetMapper(&MyMapper{})
    engine.SetInitFunc(MyInit())
}

// core/cmd/api/main.go
func main() {
    engine := sdk.NewWithConfig("settings/app.yaml").
        SetI18nFilePath("settings/injectors.i18n.yaml")
    extensions.Register(engine)
    if err := engine.Run(); err != nil {
        slog.Error("failed to run engine", slog.String("error", err.Error()))
        os.Exit(1)
    }
}
```

## Creating an Injector

```go
type CustomerNameInjector struct{}

func (i *CustomerNameInjector) Code() string { return "customer_name" }

func (i *CustomerNameInjector) Resolve() (sdk.ResolveFunc, []string) {
    return func(ctx context.Context, injCtx *sdk.InjectorContext) (*sdk.InjectorResult, error) {
        payload := injCtx.RequestPayload().(map[string]any)
        return &sdk.InjectorResult{Value: sdk.StringValue(payload["name"].(string))}, nil
    }, nil  // dependencies
}

func (i *CustomerNameInjector) IsCritical() bool              { return true }
func (i *CustomerNameInjector) Timeout() time.Duration        { return 5 * time.Second }
func (i *CustomerNameInjector) DataType() sdk.ValueType       { return sdk.ValueTypeString }
func (i *CustomerNameInjector) DefaultValue() *sdk.InjectableValue { return nil }
func (i *CustomerNameInjector) Formats() *sdk.FormatConfig    { return nil }
```

## Value Types

| Type      | Constructor             | Constant              |
| --------- | ----------------------- | --------------------- |
| Text      | `sdk.StringValue(s)`    | `sdk.ValueTypeString` |
| Number    | `sdk.NumberValue(n)`    | `sdk.ValueTypeNumber` |
| Boolean   | `sdk.BoolValue(b)`      | `sdk.ValueTypeBool`   |
| Date/Time | `sdk.TimeValue(t)`      | `sdk.ValueTypeTime`   |
| Image     | `sdk.ImageValue(url)`   | `sdk.ValueTypeImage`  |
| Table     | `sdk.TableValueData(t)` | `sdk.ValueTypeTable`  |
| List      | `sdk.ListValueData(l)`  | `sdk.ValueTypeList`   |

See **types-reference.md** for Tables, Lists, InjectorContext, FormatConfig.

## Built-in Injectors

| Code            | Type   | Formats                            |
| --------------- | ------ | ---------------------------------- |
| `date_now`      | TIME   | DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD |
| `time_now`      | TIME   | HH:mm, HH:mm:ss, hh:mm a           |
| `date_time_now` | TIME   | Combined                           |
| `year_now`      | NUMBER | -                                  |
| `month_now`     | NUMBER | number, name, short_name           |
| `day_now`       | NUMBER | -                                  |

## Error Handling

| `IsCritical()` | On Error                         |
| -------------- | -------------------------------- |
| `true`         | Aborts render                    |
| `false`        | Uses `DefaultValue()`, continues |

## Extension Points

| Extension  | Purpose             | Register                                |
| ---------- | ------------------- | --------------------------------------- |
| Injector   | Data resolvers      | `RegisterInjector()`                    |
| Mapper     | Request parsing     | `SetMapper()`                           |
| InitFunc   | Shared setup        | `SetInitFunc()`                         |
| Provider   | Dynamic injectables | `SetWorkspaceInjectableProvider()`      |
| Auth       | Custom render auth  | `SetRenderAuthenticator()`              |
| Middleware | Request handling    | `UseMiddleware()`, `UseAPIMiddleware()` |
| Frontend   | Embedded SPA        | `SetFrontendFS()` (nil to disable)      |
| Lifecycle  | Startup/shutdown    | `OnStart()`, `OnShutdown()`             |

See **extensions-reference.md** for implementation examples.

## Configuration

See **config-reference.md** for all YAML keys, env vars, and auth setup.

**Dummy auth**: Omit `auth` config entirely for development mode.

## CLI Commands

```bash
make build      # Build frontend + embed + Go binary (single binary)
make embed-app  # Build frontend and copy to Go embed location
make run        # Run API server (with embedded frontend)
make dev        # Hot reload backend (air)
make migrate    # Apply database migrations
make test       # Run tests
make lint       # Run linter
make swagger    # Regenerate OpenAPI spec
make doctor     # Check system dependencies
```

## Common Mistakes

| Wrong                                | Correct                       |
| ------------------------------------ | ----------------------------- |
| `sdk.NewTextValue()`                 | `sdk.StringValue()`           |
| `sdk.ValueTypeText`                  | `sdk.ValueTypeString`         |
| Forgetting dependencies              | `return fn, []string{"dep1"}` |
| `IsCritical()=true` without handling | Provide `DefaultValue()`      |

## API Headers

| Header             | Purpose                             | Used By        |
| ------------------ | ----------------------------------- | -------------- |
| `Authorization`    | `Bearer <JWT>` (omit in dummy mode) | All auth routes |
| `X-Tenant-ID`      | Tenant UUID                         | Panel routes   |
| `X-Workspace-ID`   | Workspace UUID                      | Panel routes   |
| `X-Tenant-Code`    | Tenant code (e.g. `CL`)            | Render routes  |
| `X-Workspace-Code` | Workspace code (e.g. `SYSTEM`)     | Render routes  |

## References

- **config-reference.md** - YAML keys, env vars, auth, performance
- **types-reference.md** - Tables, Lists, FormatConfig, InjectorContext
- **extensions-reference.md** - Middleware, Lifecycle, Provider, Auth examples
- **patterns-reference.md** - Logging, error handling, context, anti-patterns
- **enterprise-scenarios.md** - CRM integration, Vault, validation patterns
- **domain-reference.md** - Tenants, workspaces, roles, render flow

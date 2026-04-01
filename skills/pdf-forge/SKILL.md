---
name: pdf-forge
description: Use when building, extending or using pdf-forge multi-tenant PDF template engine with Typst
allowed-tools:
  - mcp__pdf-forge__*
---

# pdf-forge

Go module for multi-tenant document templates with PDF generation via Typst.

## Installation

```bash
npx skills add https://github.com/rendis/pdf-forge --skill pdf-forge
```

## MCP Proxy

This project uses [mcp-openapi-proxy](https://github.com/rendis/mcp-openapi-proxy) as the default MCP integration.

**Repository**: https://github.com/rendis/mcp-openapi-proxy
**Install**: `go install github.com/rendis/mcp-openapi-proxy/cmd/mcp-openapi-proxy@latest`
**Repo config**: `.mcp.json` (Claude Code) + `.codex/config.toml` (Codex)
**Canonical MCP spec**: `core/docs/openapi.yaml`
**Default server name**: `pdf-forge`
**Default tool prefix**: `pf`

### MCP Tool Contract

The proxy does **not** register one MCP tool per endpoint. It always exposes exactly 3 tools:

- `pf_list_endpoints`
- `pf_describe_endpoint`
- `pf_call_endpoint`

Recommended workflow:

1. `pf_list_endpoints` → discover candidate endpoints
2. `pf_describe_endpoint` → inspect the exact contract for one `toolName`
3. `pf_call_endpoint` → execute the request with `path/query/headers/cookies/body`

Example endpoint `toolName` values:

- `pf_get_api_v1_content_templates`
- `pf_get_api_v1_content_templates_templateId`
- `pf_post_api_v1_workspace_document_types_code_render`
- `pf_post_api_v1_workspace_templates_versions_versionId_render`

### Setup

#### Claude Code

The repo includes `.mcp.json`, so Claude Code can auto-detect the MCP server when the project is opened.

Verify:

```bash
claude mcp list
claude mcp get pdf-forge
```

#### OpenAI Codex

The repo includes `./.codex/config.toml` with a project-local MCP entry:

```toml
[mcp_servers.pdf-forge]
command = "mcp-openapi-proxy"
args = []

[mcp_servers.pdf-forge.env]
MCP_SPEC = "https://raw.githubusercontent.com/rendis/pdf-forge/main/core/docs/openapi.yaml"
MCP_BASE_URL = "http://localhost:8080"
MCP_TOOL_PREFIX = "pf"
```

#### OIDC Authentication

For protected environments:

```bash
mcp-openapi-proxy login pdf-forge
mcp-openapi-proxy status
mcp-openapi-proxy logout
```

If using the repo-local Codex config explicitly:

```bash
mcp-openapi-proxy login --codex-config ./.codex/config.toml --server pdf-forge
```

### Multi-tenant Headers

`pdf-forge` is multi-tenant. MCP calls often need contextual headers:

**Panel routes**

- `X-Tenant-ID`
- `X-Workspace-ID`

**Render routes**

- `X-Tenant-Code`
- `X-Workspace-Code`
- `X-Environment` (`dev` or `prod`)

Pass them:

- per request in `pf_call_endpoint.headers`, or
- globally with `MCP_EXTRA_HEADERS`

Dummy auth mode skips JWT validation, but tenant/workspace headers are still required where the route expects them.

### Spec Generation

`mcp-openapi-proxy` requires **OpenAPI 3.x**. This repo still generates Swagger 2.0 for Swagger UI, and `make swagger` converts it into `core/docs/openapi.yaml` for MCP:

```bash
make swagger
```

If you are working with local, uncommitted API changes, regenerate the spec and temporarily point `MCP_SPEC` to `./core/docs/openapi.yaml`. The committed default config intentionally uses the GitHub raw URL from `main`.

## How It Works

```plaintext
Tenant → Workspace → Template → Version (DRAFT → [STAGING] → PUBLISHED)
                                    ↓
                              Injectables (variables)
                                    ↓
                              Render → PDF

Render Modes:
  1. By DocType:    POST /api/v1/workspace/document-types/{code}/render
  2. By Version ID: POST /api/v1/workspace/templates/versions/{id}/render
```

**Render by Version ID** bypasses document type resolution — useful for testing/sandbox scenarios where multiple templates share the same docType. Uses the full injectable pipeline (InitFuncs, registry, provider).

**Staging Mode**: Send `X-Environment: dev` header on render endpoints to resolve STAGING versions first, falling back to PUBLISHED. `X-Environment` is required (`dev` or `prod`). Only one STAGING version per template (DB-enforced).

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
make swagger    # Regenerate Swagger + OpenAPI specs
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
| `X-Environment`    | Required: `dev` or `prod`          | Render routes  |

## References

- **config-reference.md** - YAML keys, env vars, auth, performance
- **types-reference.md** - Tables, Lists, FormatConfig, InjectorContext
- **extensions-reference.md** - Middleware, Lifecycle, Provider, Auth examples
- **patterns-reference.md** - Logging, error handling, context, anti-patterns
- **enterprise-scenarios.md** - CRM integration, Vault, validation patterns
- **domain-reference.md** - Tenants, workspaces, roles, render flow

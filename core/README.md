# pdf-forge / core

Backend API for the pdf-forge multi-tenant PDF template engine.

## Quick Start

```bash
make run        # Start API server (requires PostgreSQL + Typst)
make migrate    # Apply database migrations
make dev        # Hot reload with air
```

## Structure

```
cmd/api/
  main.go              Entrypoint (server / migrate subcommand)
  bootstrap/           Engine, DI wiring, preflight checks
internal/              Domain logic, adapters, infrastructure
  core/port/           Extension interfaces (Injector, RequestMapper, etc.)
  core/entity/         Domain types (InjectableValue, InjectorContext, etc.)
  core/service/        Business logic
  adapters/            HTTP controllers, PostgreSQL repositories
  infra/               Config, server, logging, registry
  migrations/          Embedded SQL migrations
extensions/            User customization point
  register.go          Registers all extensions with Engine
  injectors/           Custom injectors
  mapper.go            RequestMapper stub
  provider.go          WorkspaceInjectableProvider stub
  middleware.go        Middleware examples
settings/app.yaml      Default configuration
```

## Extending

All user code goes in `extensions/`. Edit `extensions/register.go`:

```go
func Register(engine *bootstrap.Engine) {
    engine.RegisterInjector(&injectors.MyInjector{})
    engine.SetMapper(&MyMapper{})
    // ...
}
```

Import types directly:
- `internal/core/port` — interfaces
- `internal/core/entity` — domain types
- `cmd/api/bootstrap` — Engine type

## Configuration

YAML (`settings/app.yaml`) + environment variables (`DOC_ENGINE_*` prefix).

Key settings:
- `server.port` (default: 8080)
- `server.cors.allowed_origins` (default: `["*"]`)
- `database.*` — PostgreSQL connection
- `auth.panel` — OIDC provider
- `typst.bin_path`, `typst.max_concurrent` (default: 20)

## API

All routes under `/api/v1/*`. Health at `/health`, `/ready`.

See `docs/` for detailed documentation on authorization, configuration, and architecture.

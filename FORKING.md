# Forking Guide

pdf-forge is designed to be forked and customized. This guide covers setup, customization, and upgrading.

## Quick Start

```bash
# 1. Fork on GitHub: click "Fork" at github.com/rendis/pdf-forge

# 2. Clone your fork
git clone https://github.com/<you>/pdf-forge.git
cd pdf-forge

# 3. Set up upstream tracking
make init-fork

# 4. Start everything
docker compose up --build
```

Frontend: [http://localhost:3000](http://localhost:3000) · API: [http://localhost:8080](http://localhost:8080)

## What to Customize

| Path                            | Purpose                                            |
| ------------------------------- | -------------------------------------------------- |
| `core/extensions/register.go`   | Register your injectors, mapper, middleware, hooks |
| `core/extensions/injectors/`    | Add your own injector `.go` files                  |
| `core/extensions/mapper.go`     | Transform render request payloads                  |
| `core/extensions/middleware.go` | Add custom middleware                              |
| `core/extensions/provider.go`   | Dynamic workspace-specific injectables             |
| `core/settings/app.yaml`        | Server config, database, auth, CORS                |
| `docker-compose.override.yaml`  | Local Docker overrides (gitignored)                |

## What NOT to Change

| Path             | Why                                                                 |
| ---------------- | ------------------------------------------------------------------- |
| `core/go.mod`    | Module path must stay `github.com/rendis/pdf-forge` (see FAQ below) |
| `core/internal/` | Engine internals — updated by upstream                              |
| `core/cmd/`      | Entrypoint — calls your `extensions.Register()`                     |
| `app/`           | Frontend SPA — unless you need UI changes                           |

## Upgrading Your Fork

When a new version is released:

```bash
# 1. Check if upgrade is safe
make check-upgrade VERSION=v1.2.0

# Example output:
# === Upgrade check: v1.2.0 ===
#
# Merge conflicts......... ok (clean merge)
# Build after merge....... ok
# Interface changes........ ok (no changes)
# New migrations........... 2 new (run: make migrate after upgrade)
#
# Ready. Run: make sync-upstream VERSION=v1.2.0

# 2. Apply the upgrade
make sync-upstream VERSION=v1.2.0

# 3. Build and test
make build && make test

# 4. Apply new migrations (if any)
make migrate

# 5. Restart
docker compose up --build
```

### Handling Merge Conflicts

Conflicts should only occur in `core/extensions/` — your customization zone. When they do:

1. `.gitattributes` is configured to prefer **your version** of extension files
2. If a conflict still occurs, resolve it manually — your code takes priority
3. Run `make build && make test` to verify everything compiles

### What `check-upgrade` Verifies

| Check                 | What it does                                                       |
| --------------------- | ------------------------------------------------------------------ |
| **Merge conflicts**   | Simulates the merge without applying it                            |
| **Build after merge** | Temporarily merges and runs `go build` to catch compile errors     |
| **Interface changes** | Checks if `internal/core/port/` interfaces changed                 |
| **New migrations**    | Counts new SQL migration files to remind you to run `make migrate` |

## Health Check

Run `make doctor` to verify your environment:

```bash
make doctor

# === pdf-forge doctor ===
#
# Go.............. ok
# Typst........... ok
# PostgreSQL...... ok
# pnpm............ ok
# Upstream remote. ok
# Go build........ ok
# Go modules...... ok
#
# Done.
```

## Docker Customization

Use `docker-compose.override.yaml` for local overrides without touching the base file:

```yaml
# docker-compose.override.yaml (gitignored — your local config)
services:
  api:
    environment:
      DOC_ENGINE_DATABASE_HOST: my-db-host
      DOC_ENGINE_SERVER_PORT: "9090"
    ports:
      - "9090:9090"

  web:
    environment:
      VITE_API_URL: http://localhost:9090
```

Docker Compose automatically merges `docker-compose.yaml` + `docker-compose.override.yaml`.

## Go Module Path FAQ

**Q: Do I need to change the module path in `core/go.mod`?**

A: **No.** The module path `github.com/rendis/pdf-forge` must stay unchanged. Since pdf-forge is a binary (not a library), the module path does not need to match your GitHub URL. Go resolves all imports locally within `core/`. Changing it would break every import in the codebase.

**Q: Won't `go get` fail with my fork's URL?**

A: You don't use `go get` with pdf-forge — it's not a library. You build it directly: `make build` or `docker compose up --build`.

**Q: What about `go mod tidy`?**

A: It works normally. The module path is an internal identifier, not a download URL. All dependencies are fetched from their own URLs as specified in `go.sum`.

## Alternative: Clone Without Fork

For teams that prefer no "forked from" badge on GitHub:

```bash
git clone https://github.com/rendis/pdf-forge.git my-project
cd my-project
git remote rename origin upstream
git remote add origin https://github.com/<org>/my-project.git
git push -u origin main
git config merge.ours.driver true
```

The upgrade workflow is identical: `make check-upgrade VERSION=vX.Y.Z` → `make sync-upstream VERSION=vX.Y.Z`.

## Contributing Back

To contribute improvements to the engine itself:

```bash
# 1. Create a feature branch
git checkout -b fix/my-improvement

# 2. Make changes to core/internal/ (NOT extensions/)
# 3. Test: make build && make test && make lint

# 4. Push to your fork
git push origin fix/my-improvement

# 5. Open a PR against rendis/pdf-forge
```

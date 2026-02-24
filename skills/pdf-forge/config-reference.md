# Configuration Reference

Complete configuration reference for pdf-forge.

## Configuration Precedence

1. **Environment variables** (highest priority)
2. **YAML config file** (`app.yaml`)
3. **Built-in defaults** (lowest priority)

```go
// NewWithConfig loads from a specific file (env vars still override)
engine := sdk.NewWithConfig("settings/app.yaml")

// New() loads from standard locations
engine := sdk.New()
```

## Environment Variables

**Prefix**: `DOC_ENGINE_` (hardcoded, cannot be changed)

**Pattern**: `DOC_ENGINE_<SECTION>_<KEY>` (dots → underscores)

### Server

| Env Var                              | YAML Key                  | Default | Description                                               |
| ------------------------------------ | ------------------------- | ------- | --------------------------------------------------------- |
| `DOC_ENGINE_SERVER_PORT`             | `server.port`             | `8080`  | HTTP port                                                 |
| `DOC_ENGINE_SERVER_READ_TIMEOUT`     | `server.read_timeout`     | `30`    | Read timeout (seconds)                                    |
| `DOC_ENGINE_SERVER_WRITE_TIMEOUT`    | `server.write_timeout`    | `30`    | Write timeout (seconds)                                   |
| `DOC_ENGINE_SERVER_SHUTDOWN_TIMEOUT` | `server.shutdown_timeout` | `10`    | Graceful shutdown (seconds)                               |
| `DOC_ENGINE_SERVER_SWAGGER_UI`       | `server.swagger_ui`       | `false` | Enable Swagger UI at `/swagger/*`                         |
| `DOC_ENGINE_SERVER_CORS_ALLOWED_ORIGINS` | `server.cors.allowed_origins` | `["*"]` | Allowed CORS origins                              |
| `DOC_ENGINE_SERVER_CORS_ALLOWED_HEADERS` | `server.cors.allowed_headers` | `[]`    | Extra CORS headers (appended to built-in list)    |
| `PORT`                               | -                         | -       | **Special**: Overrides `server.port` (PaaS compatibility) |

### Database

| Env Var                                     | YAML Key                         | Default      | Description                                   |
| ------------------------------------------- | -------------------------------- | ------------ | --------------------------------------------- |
| `DOC_ENGINE_DATABASE_HOST`                  | `database.host`                  | `localhost`  | PostgreSQL host                               |
| `DOC_ENGINE_DATABASE_PORT`                  | `database.port`                  | `5432`       | PostgreSQL port                               |
| `DOC_ENGINE_DATABASE_USER`                  | `database.user`                  | `postgres`   | Database user                                 |
| `DOC_ENGINE_DATABASE_PASSWORD`              | `database.password`              | `""`         | Database password                             |
| `DOC_ENGINE_DATABASE_NAME`                  | `database.name`                  | `doc_engine` | Database name                                 |
| `DOC_ENGINE_DATABASE_SSL_MODE`              | `database.ssl_mode`              | `disable`    | SSL mode: `disable`, `require`, `verify-full` |
| `DOC_ENGINE_DATABASE_MAX_POOL_SIZE`         | `database.max_pool_size`         | `10`         | Max open connections                          |
| `DOC_ENGINE_DATABASE_MIN_POOL_SIZE`         | `database.min_pool_size`         | `2`          | Min idle connections                          |
| `DOC_ENGINE_DATABASE_MAX_IDLE_TIME_SECONDS` | `database.max_idle_time_seconds` | `300`        | Max idle time before closing                  |

### Auth (Panel vs Render)

Separates OIDC authentication for panel (login/UI) vs render endpoints. Omit `auth` entirely = dummy auth mode.

**With discovery** (recommended - auto-fetches issuer/jwks_url):

```yaml
auth:
  panel:
    name: "keycloak"
    discovery_url: "https://auth.example.com/realms/web"
    audience: "pdf-forge-web"  # optional
  render_providers:
    - name: "azure-ad"
      discovery_url: "https://login.microsoftonline.com/{tenant}/v2.0"
```

**Without discovery** (explicit values):

```yaml
auth:
  panel:
    name: "web-panel"
    issuer: "https://auth.example.com/realms/web"
    jwks_url: "https://auth.example.com/realms/web/.../certs"
    audience: "pdf-forge-web"
```

| Field                | Required | Description                                     |
| -------------------- | -------- | ----------------------------------------------- |
| `name`               | Yes      | Human-readable name (logs)                      |
| `discovery_url`      | No*      | OpenID Connect discovery URL (auto-fetches)     |
| `issuer`             | No*      | Expected JWT issuer (`iss` claim)               |
| `jwks_url`           | No*      | JWKS endpoint URL                               |
| `audience`           | No       | Expected audience. Empty = skip                 |

\* Either `discovery_url` OR both `issuer` + `jwks_url` required.

**Route auth**:

- **Panel routes** (`/api/v1/*` except render): `auth.panel` only
- **Render routes**: `auth.panel` + `auth.render_providers`

**Note**: Auth config cannot be set via env vars (YAML only).

### Typst (PDF Rendering)

| Env Var                                                 | YAML Key                                     | Default | Description                                   |
| ------------------------------------------------------- | -------------------------------------------- | ------- | --------------------------------------------- |
| `DOC_ENGINE_TYPST_BIN_PATH`                             | `typst.bin_path`                             | `typst` | Path to Typst CLI binary                      |
| `DOC_ENGINE_TYPST_TIMEOUT_SECONDS`                      | `typst.timeout_seconds`                      | `10`    | Max render time per PDF                       |
| `DOC_ENGINE_TYPST_MAX_CONCURRENT`                       | `typst.max_concurrent`                       | `20`    | Parallel renders (0=unlimited)                |
| `DOC_ENGINE_TYPST_ACQUIRE_TIMEOUT_SECONDS`              | `typst.acquire_timeout_seconds`              | `5`     | Wait for render slot before `ErrRendererBusy` |
| `DOC_ENGINE_TYPST_TEMPLATE_CACHE_TTL_SECONDS`           | `typst.template_cache_ttl_seconds`           | `60`    | Compiled template cache TTL                   |
| `DOC_ENGINE_TYPST_TEMPLATE_CACHE_MAX_ENTRIES`           | `typst.template_cache_max_entries`           | `1000`  | Max cached templates (LRU eviction)           |
| `DOC_ENGINE_TYPST_IMAGE_CACHE_DIR`                      | `typst.image_cache_dir`                      | `""`    | Persistent image cache dir. Empty = temp dir  |
| `DOC_ENGINE_TYPST_IMAGE_CACHE_MAX_AGE_SECONDS`          | `typst.image_cache_max_age_seconds`          | `300`   | Max age for cached images                     |
| `DOC_ENGINE_TYPST_IMAGE_CACHE_CLEANUP_INTERVAL_SECONDS` | `typst.image_cache_cleanup_interval_seconds` | `60`    | Auto-cleanup interval                         |

**Note**: `typst.font_dirs` (array) cannot be set via env var, YAML only.

### Logging

| Env Var                     | YAML Key         | Default | Description                      |
| --------------------------- | ---------------- | ------- | -------------------------------- |
| `DOC_ENGINE_LOGGING_LEVEL`  | `logging.level`  | `info`  | `debug`, `info`, `warn`, `error` |
| `DOC_ENGINE_LOGGING_FORMAT` | `logging.format` | `json`  | `json`, `text`                   |

### Environment

| Env Var                  | YAML Key      | Default       | Description                 |
| ------------------------ | ------------- | ------------- | --------------------------- |
| `DOC_ENGINE_ENVIRONMENT` | `environment` | `development` | Deployment environment name |

## Example .env File

```bash
# Server
DOC_ENGINE_SERVER_PORT=8080
PORT=8080  # Alternative (PaaS)

# Database
DOC_ENGINE_DATABASE_HOST=postgres.example.com
DOC_ENGINE_DATABASE_PORT=5432
DOC_ENGINE_DATABASE_USER=pdfforge
DOC_ENGINE_DATABASE_PASSWORD=secretpassword
DOC_ENGINE_DATABASE_NAME=pdfforge_prod
DOC_ENGINE_DATABASE_SSL_MODE=require
DOC_ENGINE_DATABASE_MAX_POOL_SIZE=20

# Auth: Configure auth.panel + auth.render_providers in YAML (cannot be set via env vars)
# See app.yaml for OIDC configuration
# Empty auth config = dummy auth mode (dev only)

# Typst
DOC_ENGINE_TYPST_BIN_PATH=/usr/local/bin/typst
DOC_ENGINE_TYPST_MAX_CONCURRENT=16
DOC_ENGINE_TYPST_IMAGE_CACHE_DIR=/var/cache/pdfforge/images

# Logging
DOC_ENGINE_LOGGING_LEVEL=info
DOC_ENGINE_LOGGING_FORMAT=json
```

## Example app.yaml

```yaml
server:
  port: "8080"
  read_timeout: 30
  write_timeout: 30
  shutdown_timeout: 10
  swagger_ui: false
  cors:
    allowed_origins: ["*"]
    # allowed_headers: ["X-Environment"]  # extra CORS headers

database:
  host: localhost
  port: 5432
  user: postgres
  password: ""
  name: pdfforge
  ssl_mode: disable
  max_pool_size: 10
  min_pool_size: 2
  max_idle_time_seconds: 300

# Auth config (omit for dummy mode)
auth:
  panel:
    name: "web-panel"
    issuer: "https://auth.example.com/realms/web"
    jwks_url: "https://auth.example.com/realms/web/.../certs"
    audience: "pdf-forge-web"
  # render_providers: []  # Optional: additional OIDC for render only

typst:
  bin_path: typst
  timeout_seconds: 10
  max_concurrent: 20
  acquire_timeout_seconds: 5
  template_cache_ttl_seconds: 60
  template_cache_max_entries: 1000
  image_cache_dir: ""
  image_cache_max_age_seconds: 300
  image_cache_cleanup_interval_seconds: 60
  font_dirs: [] # YAML only, cannot set via env var

logging:
  level: info
  format: json

environment: development
```

## Performance Tuning

| Scenario               | Recommended Config                                           |
| ---------------------- | ------------------------------------------------------------ |
| **High throughput**    | `max_concurrent` = CPU cores, `max_pool_size` = 20+          |
| **Repeated templates** | `template_cache_max_entries` = 2000, `ttl` = 300             |
| **Many images**        | Set `image_cache_dir` to persistent path, increase `max_age` |
| **Memory limited**     | `max_concurrent` = 5, `cache_max_entries` = 100              |
| **Slow database**      | Increase `max_pool_size`, increase `max_idle_time_seconds`   |

### Concurrency Formula

```plaintext
max_concurrent = min(CPU_CORES, AVAILABLE_MEMORY_GB * 2)
max_pool_size = max_concurrent + 5  # headroom for non-render queries
```

## SDK / Engine API

```go
// Default config (loads from standard locations + env vars)
engine := sdk.New()

// Load from specific YAML file (env vars override)
engine := sdk.NewWithConfig("settings/app.yaml")

// Load injector translations (method chain)
engine.SetI18nFilePath("settings/injectors.i18n.yaml")

// Custom design tokens for PDF rendering
engine.SetDesignTokens(sdk.DefaultDesignTokens())
```

## Runtime-Only Settings

These are NOT configurable via YAML or env vars:

| Setting           | How to Set                      | Description             |
| ----------------- | ------------------------------- | ----------------------- |
| `DummyAuth`       | Automatic when no `auth` config | Enables dummy auth mode |
| `DummyAuthUserID` | Automatic                       | Seeded admin user ID    |

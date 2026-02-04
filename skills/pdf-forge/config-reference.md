# Configuration Reference

Complete configuration reference for pdf-forge.

## Configuration Precedence

1. **Environment variables** (highest priority)
2. **YAML config file** (`app.yaml`)
3. **Built-in defaults** (lowest priority)

```go
// Programmatic config takes precedence over file
engine := sdk.New(
    sdk.WithConfig(cfg),      // Wins if both set
    sdk.WithConfigFile(path), // Fallback
)
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

### Auth (Multi-OIDC)

Supports N OIDC providers. Tokens validated by matching `iss` claim. Unknown issuer → 401. Empty list → dummy auth mode.

```yaml
oidc_providers:
  - name: "web-clients"
    issuer: "https://auth.example.com/realms/web"
    jwks_url: "https://auth.example.com/realms/web/.../certs"
    audience: "pdf-forge-web"  # optional
  - name: "internal-services"
    issuer: "https://auth.example.com/realms/services"
    jwks_url: "https://auth.example.com/realms/services/.../certs"
```

| Field                         | Required | Description                                 |
| ----------------------------- | -------- | ------------------------------------------- |
| `oidc_providers[].name`       | Yes      | Human-readable name (logs)                  |
| `oidc_providers[].issuer`     | Yes      | Expected JWT issuer (`iss` claim)           |
| `oidc_providers[].jwks_url`   | Yes      | JWKS endpoint URL                           |
| `oidc_providers[].audience`   | No       | Expected audience (`aud`). Empty = skip     |

**Note**: `oidc_providers` cannot be set via env vars (YAML only for arrays).

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

# Auth: Configure oidc_providers in YAML (cannot be set via env vars)
# See app.yaml for multi-OIDC configuration
# Empty oidc_providers = dummy auth mode (dev only)

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

# Multi-OIDC auth (empty list = dummy mode)
oidc_providers:
  - name: "web-clients"
    issuer: "https://auth.example.com/realms/web"
    jwks_url: "https://auth.example.com/realms/web/.../certs"
    audience: "pdf-forge-web"

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

## SDK Options

```go
// Load from YAML file (env vars override)
sdk.WithConfigFile("config/app.yaml")

// Provide config programmatically (takes precedence)
sdk.WithConfig(&config.Config{
    Server: config.ServerConfig{Port: "9000"},
    // ...
})

// Load injector translations
sdk.WithI18nFile("config/injectors.i18n.yaml")

// Development: proxy frontend to Vite
sdk.WithDevFrontendURL("http://localhost:5173")
```

## Runtime-Only Settings

These are NOT configurable via YAML or env vars:

| Setting           | How to Set                              | Description             |
| ----------------- | --------------------------------------- | ----------------------- |
| `DummyAuth`       | Automatic when `oidc_providers` empty   | Enables dummy auth mode |
| `DummyAuthUserID` | Automatic                               | Seeded admin user ID    |
| `DevFrontendURL`  | `sdk.WithDevFrontendURL()`              | Frontend dev proxy      |

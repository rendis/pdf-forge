# Configuration Reference

YAML config file: `settings/app.yaml`. Env var override prefix: `DOC_ENGINE_*` (e.g., `DOC_ENGINE_SERVER_PORT=9000`).

## server

| Key                       | Default  | Description                                                           |
| ------------------------- | -------- | --------------------------------------------------------------------- |
| `server.port`             | `"8080"` | HTTP port. Also overridden by `PORT` env var (for PaaS compatibility) |
| `server.read_timeout`     | `30`     | Read timeout in seconds                                               |
| `server.write_timeout`    | `30`     | Write timeout in seconds                                              |
| `server.shutdown_timeout` | `10`     | Graceful shutdown timeout in seconds                                  |

## database

| Key                              | Default     | Description                               |
| -------------------------------- | ----------- | ----------------------------------------- |
| `database.host`                  | `localhost` | PostgreSQL host                           |
| `database.port`                  | `5432`      | PostgreSQL port                           |
| `database.user`                  | `postgres`  | DB user                                   |
| `database.password`              | `""`        | DB password                               |
| `database.name`                  | `pdf_forge` | DB name                                   |
| `database.ssl_mode`              | `disable`   | SSL mode (disable, require, verify-full)  |
| `database.max_pool_size`         | `10`        | Max open connections                      |
| `database.min_pool_size`         | `2`         | Min idle connections                      |
| `database.max_idle_time_seconds` | `300`       | Max idle time before closing a connection |

## auth

| Key             | Default | Description                                                            |
| --------------- | ------- | ---------------------------------------------------------------------- |
| `auth.jwks_url` | `""`    | JWKS endpoint URL. **Empty = dummy auth mode** (auto-seeds admin user) |
| `auth.issuer`   | `""`    | Expected JWT issuer                                                    |
| `auth.audience` | `""`    | Expected JWT audience                                                  |

Auth is generic OIDC/JWKS — works with Keycloak, Auth0, Cognito, or any OIDC provider. Claims struct: `OIDCClaims` in `jwt_auth.go`. Frontend uses generic OIDC (`oidc.ts`) with explicit endpoint URLs.

## internal_api

| Key                    | Default | Description                                              |
| ---------------------- | ------- | -------------------------------------------------------- |
| `internal_api.enabled` | `true`  | Enable `/internal/*` routes                              |
| `internal_api.api_key` | `""`    | API key for service-to-service auth (`X-API-Key` header) |

## logging

| Key              | Default | Description                          |
| ---------------- | ------- | ------------------------------------ |
| `logging.level`  | `info`  | Log level (debug, info, warn, error) |
| `logging.format` | `json`  | Log format (json, text)              |

## typst

| Key                                          | Default | Description                                                                        |
| -------------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `typst.bin_path`                             | `typst` | Path to Typst CLI binary                                                           |
| `typst.timeout_seconds`                      | `10`    | Max time per render                                                                |
| `typst.font_dirs`                            | `[]`    | Additional font directories                                                        |
| `typst.max_concurrent`                       | `20`    | Max parallel renders (0 = unlimited). Tune based on CPU cores                      |
| `typst.acquire_timeout_seconds`              | `5`     | How long to wait for a render slot before returning ErrRendererBusy                |
| `typst.template_cache_ttl_seconds`           | `60`    | Compiled template cache TTL                                                        |
| `typst.template_cache_max_entries`           | `1000`  | Max cached templates (LRU eviction)                                                |
| `typst.image_cache_dir`                      | `""`    | Disk cache directory for downloaded images. Empty = temp dir (no persistent cache) |
| `typst.image_cache_max_age_seconds`          | `300`   | Max age for cached images                                                          |
| `typst.image_cache_cleanup_interval_seconds` | `60`    | Auto-cleanup interval                                                              |

## Performance Tuning

| Scenario                       | Keys to adjust                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| High render throughput         | Increase `typst.max_concurrent` (match CPU cores), increase `database.max_pool_size`     |
| Frequent same-template renders | Increase `typst.template_cache_max_entries` and `template_cache_ttl_seconds`             |
| Templates with many images     | Set `typst.image_cache_dir` to a persistent path, increase `image_cache_max_age_seconds` |
| Memory-constrained env         | Lower `typst.max_concurrent`, lower `template_cache_max_entries`                         |
| Slow DB                        | Increase `database.max_pool_size`, increase `database.max_idle_time_seconds`             |

## Environment Variables for Secrets

Never put secrets in app.yaml. Use env vars:

```bash
DOC_ENGINE_DATABASE_PASSWORD=xxx
DOC_ENGINE_AUTH_JWKS_URL=https://...
DOC_ENGINE_INTERNAL_API_API_KEY=xxx
```

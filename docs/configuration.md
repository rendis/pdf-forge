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

## oidc_providers

Supports N OIDC providers. Tokens are validated against the provider matching the token's `iss` claim. Unknown issuer → 401. Empty list → dummy auth mode.

| Key                           | Required | Description                                     |
| ----------------------------- | -------- | ----------------------------------------------- |
| `oidc_providers[].name`       | Yes      | Human-readable name (for logs)                  |
| `oidc_providers[].issuer`     | Yes      | Expected JWT issuer (`iss` claim)               |
| `oidc_providers[].jwks_url`   | Yes      | JWKS endpoint URL                               |
| `oidc_providers[].audience`   | No       | Expected audience (`aud` claim). Empty = skip   |

### Example

```yaml
oidc_providers:
  - name: "web-clients"
    issuer: "https://auth.example.com/realms/web"
    jwks_url: "https://auth.example.com/realms/web/protocol/openid-connect/certs"
    audience: "pdf-forge-web"

  - name: "internal-services"
    issuer: "https://auth.example.com/realms/services"
    jwks_url: "https://auth.example.com/realms/services/protocol/openid-connect/certs"
```

### Auth Flow

1. Extract `iss` claim from token (without signature validation)
2. Find provider by issuer
3. Validate signature with matched provider's JWKS
4. Validate audience (if configured)
5. Reject with 401 if issuer unknown or validation fails

### Provider Startup Behavior

- JWKS endpoints are fetched at startup for each provider
- If a provider's JWKS is unreachable, that provider is skipped (logged as warning)
- Other providers continue working
- keyfunc handles background refresh (default: 1 hour)

Auth is generic OIDC/JWKS — works with Keycloak, Auth0, Cognito, or any OIDC provider. Claims struct: `OIDCClaims` in `jwt_auth.go`.

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

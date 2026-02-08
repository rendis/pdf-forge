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

Separates OIDC authentication for **panel** (login/UI) vs **render** endpoints. Omit `auth` section entirely = dummy auth mode.

### Configuration Fields

| Key                             | Required | Description                                           |
| ------------------------------- | -------- | ----------------------------------------------------- |
| `auth.panel.name`               | Yes      | Human-readable name (for logs)                        |
| `auth.panel.discovery_url`      | No*      | OpenID Connect discovery URL (auto-fetches issuer/jwks) |
| `auth.panel.issuer`             | No*      | Expected JWT issuer (`iss` claim)                     |
| `auth.panel.jwks_url`           | No*      | JWKS endpoint URL                                     |
| `auth.panel.audience`           | No       | Expected audience (`aud`). Empty = skip               |
| `auth.render_providers[].name`  | Yes      | Provider name for logs                                |
| `auth.render_providers[].discovery_url` | No* | OpenID Connect discovery URL                      |
| `auth.render_providers[].issuer`| No*     | JWT issuer                                            |
| `auth.render_providers[].jwks_url`| No*   | JWKS endpoint                                         |
| `auth.render_providers[].audience`| No    | Audience validation                                   |

\* Either `discovery_url` OR both `issuer` + `jwks_url` must be provided.

### OIDC Discovery

When `discovery_url` is configured, the system automatically fetches `issuer` and `jwks_uri` from the OpenID Connect discovery endpoint at startup. This simplifies configuration and ensures values match the provider's actual configuration.

**Discovery URL format**: If the URL doesn't end with `/.well-known/openid-configuration`, it's appended automatically.

```yaml
# Using discovery (recommended)
auth:
  panel:
    name: "keycloak"
    discovery_url: "https://auth.example.com/realms/web"
    audience: "pdf-forge-web"  # optional, not from discovery

  render_providers:
    - name: "azure-ad"
      discovery_url: "https://login.microsoftonline.com/{tenant}/v2.0"
```

**Startup logs**:
```
INFO OIDC discovery started name=keycloak url=https://auth.example.com/realms/web/.well-known/openid-configuration
INFO OIDC discovery completed name=keycloak issuer=https://auth.example.com/realms/web jwks_uri=https://auth.example.com/realms/web/protocol/openid-connect/certs duration=120ms
```

### Example (Explicit Configuration)

```yaml
# Without discovery (explicit values)
auth:
  panel:
    name: "web-panel"
    issuer: "https://auth.example.com/realms/web"
    jwks_url: "https://auth.example.com/realms/web/protocol/openid-connect/certs"
    audience: "pdf-forge-web"

  render_providers:
    - name: "internal-services"
      issuer: "https://auth.internal.com"
      jwks_url: "https://auth.internal.com/.well-known/jwks.json"
```

### Route Authentication

| Route Type | Providers Accepted | Identity Context |
| ---------- | ------------------ | ---------------- |
| Panel routes (`/api/v1/*` except render) | `auth.panel` only | Full DB lookup |
| Render routes (`/api/v1/workspace/document-types/*/render`) | `auth.panel` + `auth.render_providers` | None (token claims only) |

### Render Endpoint Security

The render endpoint is **public by design**:
- Only validates OIDC token is valid (signature, expiration)
- Does NOT validate workspace membership or roles
- Custom authorization via `engine.UseAPIMiddleware()`

```go
engine.UseAPIMiddleware(func(c *gin.Context) {
    if strings.HasPrefix(c.Request.URL.Path, "/api/v1/workspace/document-types") {
        // Your custom validation (API key, claims, etc.)
    }
    c.Next()
})
```

### Auth Flow

1. Extract `iss` claim from token (without signature validation)
2. Find provider by issuer (panel-only for panel routes, all for render)
3. Validate signature with matched provider's JWKS
4. Validate audience (if configured)
5. Reject with 401 if issuer unknown or validation fails

### Provider Startup Behavior

- JWKS endpoints are fetched at startup for each provider
- If a provider's JWKS is unreachable, that provider is skipped (logged as warning)
- Other providers continue working
- keyfunc handles background refresh (default: 1 hour)

Auth is generic OIDC/JWKS — works with Keycloak, Auth0, Cognito, or any OIDC provider. Claims struct: `OIDCClaims` in `jwt_auth.go`.

### Custom Render Authentication (Programmatic)

For non-OIDC authentication (API keys, custom JWT, service tokens), implement `RenderAuthenticator`:

```go
type RenderAuthenticator interface {
    Authenticate(c *gin.Context) (*RenderAuthClaims, error)
}

type RenderAuthClaims struct {
    UserID   string         // Required: caller identifier
    Email    string         // Optional
    Name     string         // Optional
    Provider string         // Auth method name (for logs)
    Extra    map[string]any // Custom claims
}
```

#### Registration

```go
engine.SetRenderAuthenticator(&MyAuthenticator{})
```

#### Behavior

| Custom Auth Registered | Render Endpoints                     | Panel Endpoints      |
|------------------------|--------------------------------------|----------------------|
| NO                     | OIDC (panel + render_providers)      | Panel OIDC           |
| YES                    | Custom auth (OIDC render ignored)    | Panel OIDC unchanged |

#### API Key Example

```go
type APIKeyAuth struct {
    keys map[string]string // apiKey → userID
}

func (a *APIKeyAuth) Authenticate(c *gin.Context) (*sdk.RenderAuthClaims, error) {
    key := c.GetHeader("X-API-Key")
    if key == "" {
        return nil, errors.New("missing X-API-Key header")
    }
    userID, ok := a.keys[key]
    if !ok {
        return nil, errors.New("invalid API key")
    }
    return &sdk.RenderAuthClaims{
        UserID:   userID,
        Provider: "api-key",
    }, nil
}

// Register
engine.SetRenderAuthenticator(&APIKeyAuth{
    keys: map[string]string{"sk_live_xxx": "service-1"},
})
```

#### Accessing Claims

Claims are stored in gin context with same keys as OIDC:

```go
userID, _ := c.Get("user_id")      // RenderAuthClaims.UserID
email, _ := c.Get("user_email")    // RenderAuthClaims.Email
provider, _ := c.Get("oidc_provider") // RenderAuthClaims.Provider

// Extra claims
extra := middleware.GetRenderAuthExtra(c) // map[string]any or nil
```

See [extensibility-guide.md](extensibility-guide.md#custom-render-authentication) for more examples (custom JWT, hybrid auth).

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

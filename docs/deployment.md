# Deployment Guide

## Stateless Design

The server is stateless. Scale horizontally behind a load balancer. All state lives in PostgreSQL.

## Required Infrastructure

- PostgreSQL 16+ (shared across instances)
- Typst CLI binary (installed per container)

## Environment Variables for Secrets

Never put secrets in app.yaml. Use env vars:

```bash
DOC_ENGINE_DATABASE_PASSWORD=xxx
DOC_ENGINE_AUTH_JWKS_URL=https://...
DOC_ENGINE_INTERNAL_API_API_KEY=xxx
```

## Docker

```bash
# Build
docker build -t pdf-forge .

# Run with external PG
docker-compose up --scale postgres=0

# Custom PG port
PG_PORT=5433 docker-compose up
```

The Dockerfile is multi-stage and auto-detects architecture for Typst binary download.

## Kubernetes

### Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
```

### Horizontal Scaling Considerations

- `typst.max_concurrent` is **per instance** — total cluster capacity = instances x max_concurrent
- `database.max_pool_size` is **per instance** — ensure PG `max_connections` >= sum of all instances' pool sizes
- Image cache is local to each instance. With persistent cache dir on shared volume, instances can share cache
- Template cache is in-memory per instance (LRU). No cross-instance sharing needed.

### Resource Recommendations

- **CPU**: Each concurrent render uses ~1 Typst CLI process. Set `typst.max_concurrent` ≤ available CPU cores.
- **Memory**: Base usage is low. Memory scales with concurrent renders and template cache size.
- **Disk**: Only needed if `typst.image_cache_dir` is set for persistent image caching.

## Health Checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness — app is running |
| `GET /ready` | Readiness — app can serve requests (DB connected, Typst available) |

## Preflight Checks

On startup, the engine runs preflight checks via `pdfforge-cli doctor` or automatically:
1. Typst CLI binary is accessible
2. PostgreSQL connection is valid
3. Database schema is up to date
4. Auth configuration is valid (JWKS URL reachable or dummy mode)

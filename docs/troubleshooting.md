# Troubleshooting

## Rendering

| Problem                             | Check                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Render fails with "typst not found" | `typst.bin_path` in config. Run `pdfforge-cli doctor` to verify.                                                         |
| Render returns ErrRendererBusy      | All semaphore slots taken. Increase `typst.max_concurrent` or `acquire_timeout_seconds`.                                 |
| Render timeout                      | Increase `typst.timeout_seconds`. Check template complexity (large tables, many images).                                 |
| Images missing in PDF               | Check image URLs are accessible from server. Check `image_cache_dir` permissions. Failures produce 1x1 gray placeholder. |
| PDF quality issues                  | Check Typst version. Verify font directories (`typst.font_dirs`).                                                        |

## Authentication

| Problem                  | Check                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------- |
| Auth 401 on all requests | Check `auth.jwks_url` is reachable. For dev, leave it empty for dummy auth mode.        |
| Auth claims not mapping  | Verify OIDC provider sends expected claims. Check `OIDCClaims` struct in `jwt_auth.go`. |
| Frontend login fails     | Check OIDC endpoint URLs in frontend config. Verify redirect URIs match.                |

## Database

| Problem                   | Check                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Migration fails           | Check PG connection. Run `pdfforge-cli doctor`. Ensure no manual schema changes conflict with migration order. |
| Connection pool exhausted | Increase `database.max_pool_size`. Check for connection leaks (missing `defer rows.Close()`).                  |
| Slow queries              | Check `database.max_idle_time_seconds`. Consider PG connection pooler (PgBouncer).                             |

## Frontend

| Problem              | Check                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Frontend not loading | In dev: check `WithDevFrontendURL()` points to running Vite. In prod: ensure `internal/frontend/` embed is built. |
| Swagger UI empty     | Run `make swagger` to regenerate.                                                                                 |

## General

| Problem             | Check                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| App won't start     | Run `pdfforge-cli doctor` for comprehensive check.                    |
| Config not loading  | Verify `settings/app.yaml` path. Check env var prefix `DOC_ENGINE_*`. |
| Port already in use | Change `server.port` or `PORT` env var.                               |

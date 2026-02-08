# Architecture Decision Log

This document records key architectural decisions for pdf-forge and their rationale.

## Technology Choices

| Decision                             | Rationale                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| **Typst** (not wkhtmltopdf/Chromium) | No headless browser required. Deterministic output. Fast CLI execution. Small binary (~15MB). |
| **Gin** (not chi/echo)               | Large ecosystem, battle-tested middleware, excellent performance benchmarks.                  |
| **Hexagonal Architecture**           | Clean separation of concerns. Swappable adapters (DB, HTTP). Highly testable via ports.       |
| **Embedded SPA** (go:embed)          | Single binary deployment. No separate frontend server. Dev mode proxies to Vite.              |
| **Runtime DI** (not Wire)            | No code generation step. Full control over initialization order. Easier debugging.            |
| **golang-migrate** (not goose/atlas) | Embedded SQL migrations. Simple up/down pattern. Works seamlessly with go:embed.              |
| **Semaphore concurrency**            | Prevents Typst process explosion under load. Graceful backpressure via ErrRendererBusy.       |

## Design Decisions

### Multi-Tenant Architecture

Chose a **single database, schema-based isolation** approach:

- Schemas: `tenancy`, `identity`, `content`, `organizer`
- Tenant/Workspace IDs passed via HTTP headers
- Allows future sharding if needed

### Authentication Strategy

**Panel + Render separation**:

- Panel routes: Full OIDC + identity lookup + RBAC
- Render routes: OIDC validation only, no membership checks
- Rationale: Render is often called by backend services that don't have user context

### Template Versioning

**Immutable versions with state machine**:

- DRAFT → PUBLISHED → ARCHIVED (one-way transitions)
- Can't edit PUBLISHED versions
- Rationale: Audit trail, reproducibility, rollback capability

### Injectable Resolution

**Dependency graph with topological sort**:

- Injectables can depend on other injectables
- Resolved in dependency order
- Non-critical failures use default values
- Rationale: Flexible composition without manual ordering

## Alternatives Considered

### PDF Generation

| Option             | Why Rejected                                        |
| ------------------ | --------------------------------------------------- |
| wkhtmltopdf        | Requires X11/headless display, slow, deprecated     |
| Chromium/Puppeteer | Heavy dependency (~400MB), non-deterministic timing |
| WeasyPrint         | Python dependency, CSS subset limitations           |
| PDFKit             | Node.js dependency, limited layout control          |

### State Management (Frontend)

| Option            | Why Rejected                                   |
| ----------------- | ---------------------------------------------- |
| Redux             | Overkill for app complexity, boilerplate heavy |
| Jotai             | Good but Zustand has better persistence story  |
| React Query alone | Need some global state beyond server cache     |

Chose **Zustand + TanStack Query**: Zustand for auth/context, TanStack Query for server state.

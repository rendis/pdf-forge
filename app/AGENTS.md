# AGENTS.md

This file provides guidance to AI Agents when working with the frontend application.

## Commands

```bash
# Development
pnpm dev          # Start dev server on port 3000
pnpm build        # Production build (outputs to dist/)
pnpm lint         # ESLint for TS/TSX files
pnpm preview      # Preview production build
```

## Architecture

This is a React 19 + TypeScript SPA for a multi-tenant document assembly platform. It runs as an **independent service** (not embedded in the Go backend). Uses Vite for bundling.

- **Architecture guide**: `docs/architecture.md` (stack, folder structure, code patterns, configuration)

### Deployment

The frontend is deployed independently from the backend:

- **Development**: `pnpm dev` starts Vite on port 3000, API requests go directly to `VITE_API_URL` (default: `http://localhost:8080`)
- **Production**: Built static files served by nginx, which proxies `/api/` requests to the backend service

Key files:
- `nginx.conf` — nginx config with SPA fallback and API reverse proxy
- `Dockerfile` — Multi-stage build: `node:22-alpine` (build) + `nginx:alpine` (serve)

### Routing

- **TanStack Router** with file-based routing in `src/routes/`
- Routes are auto-generated to `src/routeTree.gen.ts` by `@tanstack/router-vite-plugin`
- Root route (`__root.tsx`) enforces tenant selection before navigation
- Router basepath is `/` (root)

### State Management

- **Zustand** stores with persistence:
  - `auth-store.ts`: JWT token and system roles
  - `app-context-store.ts`: Current tenant and workspace context
  - `theme-store.ts`: Light/dark theme preference

### Authentication & Authorization

- **OIDC config fetched at runtime** from backend `{VITE_API_URL}/v1/config` — see `src/lib/auth-config.ts`
- OIDC operations in `src/lib/oidc.ts` (no external auth library)
- Mock auth mode: Set `VITE_USE_MOCK_AUTH=true` to bypass OIDC
- **RBAC system** in `src/features/auth/rbac/`:
  - Three role levels: System (SUPERADMIN), Tenant (OWNER/ADMIN), Workspace (OWNER/ADMIN/EDITOR/OPERATOR/VIEWER)
  - `usePermission()` hook checks permissions against current context
  - `<PermissionGuard>` component for declarative UI permission control
- **Permission Matrix**: Detailed docs at `docs/authorization-matrix.md` (project root)

> **IMPORTANT**: Before implementing permission validations, access controls, or using `<PermissionGuard>` / `usePermission()`, **ALWAYS** check the authorization matrix (`docs/authorization-matrix.md`) for exact per-endpoint permissions and minimum required roles.

### API Layer

- Axios client (`src/lib/api-client.ts`) auto-attaches:
  - `Authorization` header (Bearer token)
  - `X-Tenant-ID` and `X-Workspace-ID` headers from context
- Base URL: `${VITE_API_URL}/v1` (e.g., `http://localhost:8080/v1`)

> **IMPORTANT**: Before implementing or interacting with any API component, **ALWAYS** check the OpenAPI spec:
>
> 1. **MCP `pdf-forge-api` (Recommended)**: Use `mcp__pdf-forge-api__*` tools for interactive swagger queries.
>
>    If MCP is unavailable, suggest installing it via: `docs/mcp_setup.md`
>
> 2. **YAML file (Fallback)**: Only if MCP is unavailable, check `docs/swagger.yaml` directly. Warning: the swagger file is very large (~3000+ lines).

### Feature Structure

Features are organized in `src/features/` with consistent structure:

- `api/` - API calls
- `components/` - Feature-specific components
- `hooks/` - Feature hooks
- `types/` - TypeScript interfaces

Current features: `auth`, `tenants`, `workspaces`, `documents`, `editor`

### Styling

- **Tailwind CSS** with shadcn/ui-style CSS variables
- Dark mode via `class` strategy
- Colors defined as HSL CSS variables in `index.css`
- **Design System**: Full docs at `docs/design_system.md`

> **IMPORTANT**: Before creating or modifying UI components, **ALWAYS** check the Design System (`docs/design_system.md`) for visual consistency. Covers design philosophy, color palette, typography, border radius, spacing, and component patterns.

### Rich Text Editor

- **TipTap** editor with StarterKit in `src/features/editor/`
- Prose styling via `@tailwindcss/typography`

### i18n

- **i18next** with browser detection
- Translation files in `public/locales/{lng}/translation.json`
- Currently supports: `en`, `es`

## Environment Variables

```plaintext
VITE_API_URL        # Backend API base URL (dev: http://localhost:8080, prod: /api)
VITE_USE_MOCK_AUTH  # Set to "true" to skip OIDC (dev only)
```

Env files:
- `.env.development` — Used by `pnpm dev` (`VITE_API_URL=http://localhost:8080`)
- `.env.production` — Used by `pnpm build` (`VITE_API_URL=/api`)
- `.env.local` — Local overrides (not committed)

> **Note**: OIDC configuration is fetched at runtime from `{VITE_API_URL}/v1/config`. Configure OIDC in the backend's `settings/app.yaml`.

## Path Aliases

`@/` maps to `./src/` (configured in vite.config.ts)

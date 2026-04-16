# pdf-forge / app

Frontend React SPA for the pdf-forge multi-tenant PDF template engine.

In production, this SPA is **embedded in the Go binary** via `go:embed` for single binary deployment.

## Commands

```bash
pnpm dev          # Start dev server on port 3000
pnpm build        # Production build (outputs to dist/)
pnpm lint         # ESLint for TS/TSX files
pnpm preview      # Preview production build
```

## Architecture

React 19 + TypeScript SPA. Uses Vite for bundling.

- **Architecture guide**: [docs/architecture.md](docs/architecture.md)

### Deployment

- **Development**: `pnpm dev` starts Vite on port 3000 and proxies `${VITE_BASE_PATH}/api`, `/health`, `/ready`, and `/swagger` to `http://localhost:8080`
- **Production**: `make build` (from root) embeds the SPA into the Go binary. Backend serves both API and frontend on a single port.
- **Build pipeline**: `make embed-app` builds the SPA and copies output to `core/internal/frontend/dist/` for `go:embed`

### Routing

- **TanStack Router** with file-based routing in `src/routes/`
- Routes auto-generated to `src/routeTree.gen.ts` by `@tanstack/router-vite-plugin`
- Root route (`__root.tsx`) enforces tenant selection before navigation

### State Management

- **Zustand** stores with persistence:
  - `auth-store.ts`: JWT token and system roles
  - `app-context-store.ts`: Current tenant and workspace context
  - `theme-store.ts`: Light/dark theme preference

### Authentication & Authorization

- **OIDC config fetched at runtime** from backend `{VITE_BASE_PATH}/api/v1/config` — see `src/lib/auth-config.ts`
- OIDC operations in `src/lib/oidc.ts` (no external auth library)
- Mock auth mode: Set `VITE_USE_MOCK_AUTH=true` to bypass OIDC
- **RBAC system** in `src/features/auth/rbac/`:
  - Three role levels: System (SUPERADMIN), Tenant (OWNER/ADMIN), Workspace (OWNER/ADMIN/EDITOR/OPERATOR/VIEWER)
  - `usePermission()` hook checks permissions against current context
  - `<PermissionGuard>` component for declarative UI permission control
- **Permission Matrix**: See [docs/authorization-matrix.md](../core/docs/authorization-matrix.md)

### API Layer

- Axios client (`src/lib/api-client.ts`) auto-attaches:
  - `Authorization` header (Bearer token)
  - `X-Tenant-ID` and `X-Workspace-ID` headers from context
  - `X-Environment` when the editor environment store is active
- Base URL: `${VITE_BASE_PATH}/api/v1`

### Feature Structure

Features are organized in `src/features/` with consistent structure:

- `api/` — API calls
- `components/` — Feature-specific components
- `hooks/` — Feature hooks
- `types/` — TypeScript interfaces

Current features: `auth`, `tenants`, `workspaces`, `documents`, `editor`

### Styling

- **Tailwind CSS** with shadcn/ui-style CSS variables
- Dark mode via `class` strategy
- Colors defined as HSL CSS variables in `index.css`
- **Design System**: [docs/design_system.md](docs/design_system.md)

### Rich Text Editor

- **TipTap** editor with StarterKit in `src/features/editor/`
- Prose styling via `@tailwindcss/typography`

### i18n

- **i18next** with browser detection
- Translation files in `public/locales/{lng}/translation.json`
- Supports: `en`, `es`

## Environment Variables

```plaintext
VITE_BASE_PATH      # URL prefix for routes/assets/API (empty = root, e.g. /pdf-forge)
VITE_USE_MOCK_AUTH  # Set to "true" to skip OIDC (dev only)
```

Env files:

- `.env.development` — Used by `pnpm dev` (typically `VITE_BASE_PATH=`)
- `.env.production` — Used by `pnpm build` (typically `VITE_BASE_PATH=` or a deployed sub-path)
- `.env.local` — Local overrides (not committed)

> OIDC configuration is fetched at runtime from `{VITE_BASE_PATH}/api/v1/config`. Configure OIDC in the backend's `settings/app.yaml`.

## Path Aliases

`@/` maps to `./src/` (configured in `vite.config.ts`)

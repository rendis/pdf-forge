# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

## Commands

```bash
# Development
pnpm dev          # Start dev server (Vite with rolldown)
pnpm build        # Type-check (tsc -b) then build
pnpm lint         # ESLint for TS/TSX files
pnpm preview      # Preview production build
```

## Architecture

This is a React 19 + TypeScript SPA for a multi-tenant document assembly platform. It uses Vite (rolldown-vite) for bundling.

- **Guía completa de arquitectura**: `docs/architecture.md` (stack, estructura de carpetas, patrones de código, configuración)

### Routing

- **TanStack Router** with file-based routing in `src/routes/`
- Routes are auto-generated to `src/routeTree.gen.ts` by `@tanstack/router-vite-plugin`
- Root route (`__root.tsx`) enforces tenant selection before navigation

### State Management

- **Zustand** stores with persistence:
  - `auth-store.ts`: JWT token and system roles
  - `app-context-store.ts`: Current tenant and workspace context
  - `theme-store.ts`: Light/dark theme preference

### Authentication & Authorization

- **Generic OIDC** via native `fetch` (no external auth library) — see `src/lib/oidc.ts`
- Mock auth mode: Set `VITE_USE_MOCK_AUTH=true` to bypass OIDC
- **RBAC system** in `src/features/auth/rbac/`:
  - Three role levels: System (SUPERADMIN), Tenant (OWNER/ADMIN), Workspace (OWNER/ADMIN/EDITOR/OPERATOR/VIEWER)
  - `usePermission()` hook checks permissions against current context
  - `<PermissionGuard>` component for declarative UI permission control
- **Matriz de Permisos**: Documentación detallada en `../doc-engine/docs/authorization-matrix.md`

> **IMPORTANTE**: Antes de implementar validaciones de permisos, controles de acceso, uso de `<PermissionGuard>` o `usePermission()`, **SIEMPRE** consulta la matriz de autorización (`../doc-engine/docs/authorization-matrix.md`) para conocer los permisos exactos por endpoint y los roles mínimos requeridos para cada operación.

### API Layer

- Axios client (`src/lib/api-client.ts`) auto-attaches:
  - `Authorization` header (Bearer token)
  - `X-Tenant-ID` and `X-Workspace-ID` headers from context
- Backend expected at `VITE_API_URL` (default: `http://localhost:8080/api/v1`)

> **IMPORTANTE**: Antes de implementar o interactuar con cualquier componente de la API, **SIEMPRE** consulta la especificación OpenAPI siguiendo este orden de prioridad:
>
> 1. **MCP `doc-engine-api` (Recomendado)**: Usa las herramientas `mcp__doc-engine-api__*` para consultar el swagger de forma interactiva y eficiente.
>
>    **Si el MCP no está disponible**, sugiere al usuario instalarlo siguiendo la guía: `docs/mcp_setup.md`
>
> 2. **Archivo YAML (Fallback)**: Solo si el MCP no está disponible y no se puede instalar, consulta directamente `../doc-engine/docs/swagger.yaml`. **Advertencia**: El archivo swagger es muy extenso (~3000+ líneas), lo que consume mucho contexto.

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
- **Design System**: Documentación completa en `docs/design_system.md`

> **IMPORTANTE**: Antes de crear o modificar componentes UI, **SIEMPRE** consulta el Design System (`docs/design_system.md`) para mantener consistencia visual. Incluye filosofía de diseño, paleta de colores, tipografía, border radius, espaciado y patrones de componentes.

### Rich Text Editor

- **TipTap** editor with StarterKit in `src/features/editor/`
- Prose styling via `@tailwindcss/typography`

### i18n

- **i18next** with browser detection
- Translation files in `public/locales/{lng}/translation.json`
- Currently supports: `en`, `es`

## Environment Variables

```plaintext
VITE_API_URL              # Backend API base URL
VITE_OIDC_TOKEN_URL       # Full URL to OIDC token endpoint
VITE_OIDC_USERINFO_URL    # Full URL to OIDC userinfo endpoint
VITE_OIDC_LOGOUT_URL      # Full URL to OIDC logout endpoint (optional)
VITE_OIDC_CLIENT_ID       # OIDC client ID
VITE_USE_MOCK_AUTH            # Set to "true" to skip OIDC (dev only)
VITE_OIDC_PASSWORD_RESET_URL  # OIDC provider's password reset URL (optional, hides link if unset)
```

## Path Aliases

`@/` maps to `./src/` (configured in vite.config.ts)

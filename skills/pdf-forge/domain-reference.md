# Domain Reference

## Hierarchy

```plaintext
Tenant (jurisdiction/country)
  └── Workspace (operational unit)
        ├── Templates
        │     └── Versions (DRAFT → PUBLISHED → ARCHIVED)
        ├── Injectables (variables)
        ├── Folders (hierarchical organization)
        └── Tags (cross-cutting labels)
```

## Tenant

Business unit or jurisdiction (e.g., "Chile Operations", "Mexico Operations").

- Groups multiple workspaces
- Provides regional config: currency, timezone, date format, locale
- Has a special **System Tenant** (`is_system=TRUE`, code `SYS`) for global templates

## Workspace Types

| Type       | Purpose                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| **SYSTEM** | Master templates, one per tenant. Templates can be cloned to CLIENT workspaces. |
| **CLIENT** | End-user workspaces. Where actual document work happens.                        |

**States**: ACTIVE, SUSPENDED, ARCHIVED

## Template Version States

```plaintext
DRAFT ──────────────────────────→ PUBLISHED ──→ ARCHIVED
   │                                   │
   └──→ SCHEDULED ──(at scheduled time)┘
            │
            └──→ DRAFT (cancel) or ARCHIVED (cancel+archive)
```

| State     | Can Edit | Can Render | Notes                                  |
| --------- | -------- | ---------- | -------------------------------------- |
| DRAFT     | Yes      | No         | Work in progress                       |
| SCHEDULED | No       | No         | Waiting for scheduled publish time     |
| PUBLISHED | No       | Yes        | Active version (only ONE per template) |
| ARCHIVED  | No       | No         | Historical, read-only                  |

## Roles & Permissions

### System Level

| Role           | Weight | Permissions                                                      |
| -------------- | ------ | ---------------------------------------------------------------- |
| SUPERADMIN     | 100    | Everything. Auto-grants TENANT_OWNER + OWNER on all resources.   |
| PLATFORM_ADMIN | 90     | Manage tenants (except create/delete). Auto-grants TENANT_ADMIN. |

### Tenant Level

| Role         | Weight | Permissions                                                                              |
| ------------ | ------ | ---------------------------------------------------------------------------------------- |
| TENANT_OWNER | 60     | Full tenant control. Create/delete workspaces. Billing. Auto-grants ADMIN on workspaces. |
| TENANT_ADMIN | 55     | Manage workspaces and users. No create/delete tenants.                                   |

### Workspace Level

| Role     | Weight | Permissions                                                                                     |
| -------- | ------ | ----------------------------------------------------------------------------------------------- |
| OWNER    | 50     | Full workspace control. Manage members, change roles, archive workspace.                        |
| ADMIN    | 40     | Publish/archive versions. Delete content. Invite members (no role changes).                     |
| EDITOR   | 30     | Create/edit templates, injectables (TEXT only), folders, tags. Clone templates. Cannot publish. |
| OPERATOR | 20     | Generate PDFs from PUBLISHED templates only. Read-only otherwise.                               |
| VIEWER   | 10     | Read-only access. No create/edit/generate.                                                      |

**Permission logic**: Role weight >= required weight = access granted.

## Injectables

### Two Categories

| Category                  | Definition                              | Scope                                  |
| ------------------------- | --------------------------------------- | -------------------------------------- |
| **Workspace Injectables** | Defined in DB by users                  | Workspace-owned, TEXT type only via UI |
| **System Injectables**    | Defined in Go code (Injector interface) | Global, all types                      |

### Source Types

| Source   | Description                           |
| -------- | ------------------------------------- |
| INTERNAL | Calculated by system (e.g., date_now) |
| EXTERNAL | Provided by user/API at render time   |

### Data Types

| Type     | Description             |
| -------- | ----------------------- |
| TEXT     | Plain strings           |
| NUMBER   | Numeric values          |
| TIME     | Dates and times         |
| CURRENCY | Monetary amounts        |
| BOOLEAN  | True/false              |
| IMAGE    | Image references (URLs) |
| LIST     | Hierarchical lists      |
| TABLE    | Tabular data            |

**Note**: Workspace-created injectables can only be TEXT. For other types, use `WorkspaceInjectableProvider`.

## API Headers

| Header           | Required For                 | Description                              |
| ---------------- | ---------------------------- | ---------------------------------------- |
| `Authorization`  | All authenticated routes     | `Bearer <JWT>`                           |
| `X-Tenant-ID`    | `/tenant/*`, `/api/v1/*`     | Tenant UUID                              |
| `X-Workspace-ID` | `/workspace/*`, `/content/*` | Workspace UUID                           |
| `X-API-Key`      | `/internal/*`                | Service-to-service API key               |
| `X-Operation-ID` | Optional                     | Traceability (auto-generated if omitted) |

## API Routes

| Route               | Purpose                                    | Auth    |
| ------------------- | ------------------------------------------ | ------- |
| `/api/v1/*`         | Public API (templates, workspaces, render) | JWT     |
| `/internal/*`       | Service-to-service render API              | API Key |
| `/health`, `/ready` | Health checks                              | None    |
| `/swagger/*`        | Swagger UI                                 | None    |
| `/`                 | Embedded React SPA                         | None    |

## Render Flow

```plaintext
1. API Request (POST /api/v1/.../render or /internal/render)
2. Acquire semaphore slot (max_concurrent limit)
3. Run InitFunc (shared setup)
4. Resolve injectables:
   - Build dependency graph
   - Topological sort
   - Execute each injector
   - Non-critical failures → log + use default
5. Build Typst source (PortableDoc → Typst markup)
6. Resolve images (download + cache or use cached)
   - Download failure → 1x1 gray PNG placeholder
7. Typst CLI subprocess → PDF bytes
8. Return { PDF []byte, Filename, PageCount }
```

## Folders & Tags

### Folders

- Hierarchical organization within workspace
- Uses materialized path for efficient queries
- Templates optionally assigned to folders

### Tags

- Cross-cutting labels
- Many-to-many with templates
- Normalized names (lowercase, no diacritics)
- Optional HEX color

## Members

### User States

| State     | Description                   |
| --------- | ----------------------------- |
| INVITED   | Email sent, not yet logged in |
| ACTIVE    | Active user                   |
| SUSPENDED | Disabled access               |

### Membership

- **WorkspaceMember**: User ↔ Workspace with role
- **TenantMember**: User ↔ Tenant with role
- System roles auto-sync to tenant/workspace access

## Database Schemas

| Schema    | Tables                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| tenancy   | tenants, workspaces                                                                                               |
| identity  | users, workspace_members, tenant_members, system_role_assignments                                                 |
| organizer | folders, tags, workspace_tags_cache                                                                               |
| content   | templates, template_versions, injectable_definitions, template_version_injectables, system_injectable_assignments |

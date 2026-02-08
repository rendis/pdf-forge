# Architecture

pdf-forge follows **Hexagonal Architecture** (Ports and Adapters) with **domain-based organization**.

## Directory Structure

```plaintext
internal/
├── core/                      # Domain Layer (business logic)
│   ├── entity/               # Domain entities and value objects (flat structure)
│   │   └── portabledoc/      # PDF document format types
│   ├── port/                 # Output ports (repository interfaces)
│   │
│   ├── usecase/              # Input ports organized by domain
│   │   ├── access/           # System roles and access history
│   │   ├── catalog/          # Folder and tag organization
│   │   ├── injectable/       # Injectable definitions and assignments
│   │   ├── organization/     # Tenant, workspace, member management
│   │   └── template/         # Template and version management
│   │
│   ├── service/              # Business logic organized by domain
│   │   ├── access/           # Access control services
│   │   ├── catalog/          # Catalog services
│   │   ├── injectable/       # Injectable services + dependency resolution
│   │   ├── organization/     # Organization services
│   │   ├── rendering/        # PDF rendering (pdfrenderer/)
│   │   └── template/         # Template services + contentvalidator/
│   │
│   ├── formatter/            # Locale-aware formatting (date, number, phone, RUT, bool)
│   └── validation/           # Content validation
│
├── adapters/
│   ├── primary/http/         # Driving adapters (HTTP API)
│   │   ├── controller/       # HTTP handlers
│   │   ├── dto/              # Request/Response DTOs
│   │   ├── mapper/           # Entity <-> DTO mappers
│   │   └── middleware/       # HTTP middleware
│   │
│   └── secondary/            # Driven adapters
│       └── database/postgres/ # PostgreSQL repositories
│
├── extensions/               # Built-in injectors (datetime), example mappers
│
├── infra/                    # Infrastructure
│   ├── config/               # Configuration loading (Viper, YAML + env)
│   ├── logging/              # Context-aware slog handler
│   ├── registry/             # Injector/mapper registries
│   ├── server/               # HTTP server setup (Gin, CORS, SPA serving)
│   └── initializer.go        # Application bootstrap
│
├── migrations/               # Embedded SQL migrations (golang-migrate)
├── frontend/                 # Embedded React SPA (go:embed)
```

## Domain Organization

| Domain         | Description                                   |
| -------------- | --------------------------------------------- |
| `template`     | Template CRUD, versioning, content validation |
| `organization` | Tenants, workspaces, members                  |
| `injectable`   | Injectable definitions and assignments        |
| `catalog`      | Folders and tags                              |
| `access`       | System roles, access history                  |
| `rendering`    | PDF generation (Typst)                        |

## Entity Files by Domain

The `entity/` package uses a flat structure for simplicity. Files are logically grouped by domain:

| Domain           | Entity Files                                               |
| ---------------- | ---------------------------------------------------------- |
| **template**     | `template.go`, `template_version.go`, `document_type.go`   |
| **organization** | `tenant.go`, `workspace.go`, `user.go`                     |
| **injectable**   | `injectable.go`, `system_injectable.go`                    |
| **catalog**      | `folder.go`, `tag.go`                                      |
| **access**       | `user_access_history.go`                                   |
| **values**       | `table_value.go`, `list_value.go`                          |
| **shared**       | `enum.go`, `errors.go`, `format.go`, `injector_context.go` |
| **rendering**    | `portabledoc/` (subdirectory)                              |

## Dependency Flow

```plaintext
HTTP Request → Controller → UseCase (interface) → Service → Port (interface) → Repository
```

## DI Wiring

Runtime manual DI in `sdk/initializer.go` — no code generation or Wire.

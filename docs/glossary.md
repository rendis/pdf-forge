# Glossary

## Domain Concepts

### Tenant

Jurisdiction or business unit. Groups workspaces. Provides regional settings (currency, timezone, locale, date format). A system tenant (IsSystem=true) holds global templates.

### Workspace

Root operational entity. All resources (templates, users, injectables) belong to a workspace. Types: SYSTEM or CLIENT. Statuses: ACTIVE, SUSPENDED, ARCHIVED. CLIENT workspaces must have a tenant; global workspaces (TenantID=NULL) can exist without one.

**Relationship**: Tenant → Many Workspaces → Many Templates/Documents/Users

### Template

A document blueprint within a workspace. Linked to a Document Type. Contains one or more Template Versions.

### Template Version

Versioned snapshot of a template's content. Lifecycle: DRAFT → SCHEDULED → PUBLISHED → ARCHIVED. Only DRAFT versions can be edited. Contains a PortableDoc as its content structure.

**Lifecycle methods**: `CanEdit()`, `CanPublish()`, `CanArchive()`, `CanSchedulePublish()`, `Publish(userID)`, `Archive(userID)`, `SchedulePublish(time)`, `CancelSchedule()`.

### Document Type

Tenant-scoped classification for templates (e.g., "Contract", "Invoice", "Report"). Immutable code (max 50 chars), i18n name with fallback logic (requested locale → en → first available → code). Each workspace can have at most one template per document type.

### Injectable

A variable that can be injected into templates. Two kinds:

- **Workspace Injectables** (InjectableDefinition): User-defined, stored in DB. Key format: `^[a-z][a-z0-9_]*$`. Data types: TEXT, NUMBER, TIME, BOOLEAN, IMAGE, LIST, TABLE. Source types: INTERNAL (system-calculated) or EXTERNAL (user-provided at render time). Workspace-owned injectables can ONLY be TEXT type. Global injectables (WorkspaceID=NULL) are available to all workspaces.
- **System Injectables**: Code-defined via the Injector interface. Registered via the extension system. Examples: `date_now`, `year_now`.

**Template Version Injectable**: Links an injectable to a specific template version. References either `InjectableDefinitionID` OR `SystemInjectableKey` (mutually exclusive). Can have `IsRequired`, `DefaultValue`.

## Extension Interfaces

### Injector

Go interface that resolves a system injectable's value at render time. Has a dependency graph (injectors can depend on other injectors). Can be critical (abort on failure) or non-critical (log and continue with default value).

```go
type Injector interface {
    Code() string
    Resolve() (ResolveFunc, []string)  // func + dependency codes
    IsCritical() bool
    Timeout() time.Duration
    DataType() ValueType
    DefaultValue() *InjectableValue
    Formats() *FormatConfig
}
```

### RequestMapper

Go interface that transforms a custom API request payload into structured data accessible by all injectors via `InjectorContext.RequestPayload()`. Use when external consumers send business-specific JSON payloads.

**Flow**: API request → `RequestMapper.Map()` → Parsed payload → Available to all injectors via `InjectorContext.RequestPayload()`

```go
type RequestMapper interface {
    Map(ctx context.Context, mapCtx *MapperContext) (any, error)
}
```

### InitFunc

A function executed once at render start, before injectors run. Used for shared setup (DB queries, API calls) whose result is available to all injectors via `InjectorContext`.

```go
type InitFunc func(ctx context.Context, injCtx *InjectorContext) (any, error)
```

## Technical Concepts

### PortableDoc

JSON interchange format for editor documents. Based on ProseMirror's document model.

**Structure**: `Document` → `ProseMirrorDoc` → tree of `Node` objects.

**Node types**: doc, paragraph, heading, blockquote, bulletList, orderedList, taskList, listItem, injector, conditional, pageBreak, image, customImage, listInjector, tableInjector, table, tableRow, tableCell, tableHeader.

**Mark types**: bold, italic, strike, code, underline, highlight, link.

Stored as `ContentStructure` in template versions.

### FormatConfig

Locale-aware formatting rules for injectable values (date formats, number separators, boolean labels, etc.). Defined per injector via `Formats()`. Formatting presets in `internal/core/formatter/presets.go`.

### ValueType

Enum for injectable data types: TEXT, NUMBER, TIME, BOOLEAN, IMAGE, LIST, TABLE. Defined in `internal/core/entity/enum.go`.

### InjectableValue

Wrapper type for injectable values. Constructors: `NewTextValue()`, `NewNumberValue()`, `NewTimeValue()`, `NewBoolValue()`, `NewImageValue()`, `NewListValue()`, `NewTableValue()`. Defined in `internal/core/entity/injectable.go`.

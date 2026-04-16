# Portable Document Contract

`contentStructure` is the canonical document payload stored on template versions and consumed by rendering.

It is **not** HTML and **not** just editor JSON content.

It is a **PortableDoc envelope** that includes the body content plus document metadata, page configuration, variable references, optional header/footer state, and export metadata.

## Canonical Shape

The current frontend contract is defined as a `PortableDocument` and used as `contentStructure` in template version APIs.

Conceptually, the envelope contains:

- `version`
- `meta`
- `pageConfig`
- `variableIds`
- `content`
- `header` (optional)
- `footer` (optional)
- `exportInfo`

## Top-Level Fields

### `version`

Document format version string.

Current editor format version is `2.2.0`.

Use this for migration awareness, not feature guessing.

### `meta`

Document metadata such as:

- title
- description
- language
- custom metadata fields

### `pageConfig`

Controls document size and margins.

Contains:

- `formatId`
- `width`
- `height`
- `margins`

Agents should preserve existing page configuration unless the user explicitly requests layout changes.

### `variableIds`

A list of variable IDs referenced by the document.

This list matters because validation checks it against:

- injector nodes
- image injectables in body/header/footer
- accessible workspace/system injectables

If an agent introduces a new variable-backed structure, it must keep `variableIds` consistent.

### `content`

The main ProseMirror-compatible body document:

- root `doc`
- child nodes in `content`
- node `attrs`
- node `marks`
- text leaves

This is the editable body surface.

### `header` (optional)

Optional document header configuration. This is **not just body content moved upward**.

The header contains dedicated state such as:

- `enabled`
- `layout`
- `imageUrl`
- `imageAlt`
- `imageInjectableId`
- `imageInjectableLabel`
- `imageWidth`
- `imageHeight`
- `content`

Treat header edits as a distinct surface with separate constraints.

### `footer` (optional)

Optional document footer configuration. It uses the same surface contract as the header, but it is rendered on the **last page**.

The footer contains the same dedicated state shape:

- `enabled`
- `layout`
- `imageUrl`
- `imageAlt`
- `imageInjectableId`
- `imageInjectableLabel`
- `imageWidth`
- `imageHeight`
- `content`

Treat footer edits as a distinct surface with separate constraints.

### `exportInfo`

Export metadata such as timestamps, source app, optional checksum, and audit metadata.

Preserve this structure unless a workflow explicitly regenerates it.

## Body vs Surfaces

### Body

The body is the richer editing surface and may contain:

- standard text blocks
- dynamic injectors
- conditional blocks
- images
- editable tables
- list/table injectors

### Header

The header is a constrained surface with:

- limited text content
- text variable injectors (same `injector` node type as the body)
- dedicated image/logo layout modes
- its own image sizing and placement rules

Do not model the header as if it were just another body fragment.

### Footer

The footer is another constrained surface with:

- limited text content
- text variable injectors (same `injector` node type as the body/header)
- dedicated image/logo layout modes
- its own image sizing and placement rules
- last-page-only rendering behavior

Do not model the footer as if it were just another body fragment.

Validation is symmetric for text injectors across all surfaces:

- header/footer text injectors are validated against `variableIds` during publish — same rules as body injectors
- header/footer image injectables are validated separately via `imageInjectableId`
- when adding a text injector to the header or footer, ensure its variable ID appears in `variableIds`

## Node Families

## Basic structural nodes

PortableDoc supports core nodes such as:

- `paragraph`
- `heading`
- `blockquote`
- `horizontalRule`
- `text`
- `hardBreak`
- `pageBreak`

## List nodes

PortableDoc includes:

- `bulletList`
- `orderedList`
- `listItem`
- `taskList`
- `taskItem`
- `listInjector`

For default-safe agent workflows, prefer bullet/ordered lists and `listInjector` over undocumented task-list automation.

## Table nodes

PortableDoc includes:

- `table`
- `tableRow`
- `tableCell`
- `tableHeader`
- `tableInjector`

Use:

- `table` for user-authored editable tables
- `tableInjector` for dynamic structured data coming from injectables

## Dynamic nodes

PortableDoc includes:

- `injector`
- `conditional`

These are not plain text placeholders; they carry structured attrs and are validated against variables.
Inline injector nodes may also carry marks such as bold, italic, strike, and `textStyle`.

## Image nodes

PortableDoc includes:

- `image`
- `customImage`

Documented attrs include image source, dimensions, alignment, display mode, shape, and optional injectable binding.

## Marks

PortableDoc supports marks including:

- `bold`
- `italic`
- `strike`
- `code`
- `underline`
- `highlight`
- `link`
- `textStyle`

However, not every mark supported by schema/backend is part of the default-safe agent subset.

Use the capability matrix before introducing marks that are not part of the standard toolbar-driven workflow.

## Important Attr Families

### Text style attrs

`textStyle` may carry fields such as:

- `color`
- `fontSize`
- `fontFamily`

Color contract for agents:

- prefer hex (`#RRGGBB` / `#RGB`) when manually introducing a new color
- preserve existing `color` values already present in live `contentStructure`
- do **not** assume stored values are hex-only; persisted content may contain CSS `rgb(...)` / `rgba(...)` strings generated by editor styling flows

### Paragraph / heading attrs

Common attrs include:

- `textAlign`
- `lineSpacing`

### Image attrs

Documented image attrs include:

- `src`
- `alt`
- `title`
- `width`
- `height`
- `displayMode`
- `align`
- `shape`
- `injectableId`
- `injectableLabel`

### Conditional attrs

Conditionals carry structured logic metadata such as:

- `conditions`
- `expression`

Preserve those structures exactly when editing existing conditional content.

## Compatibility Policy for Agents

When editing `contentStructure` through MCP:

1. **Preserve unknown fields**.
2. **Do not downgrade document versions manually**.
3. **Do not invent new node/mark attrs ad hoc**.
4. **Do not remove unrelated `variableIds` while editing a subtree**.
5. **Prefer minimal diffs** rather than whole-document rewrites.

## Validation Boundary for Draft Saves

Successful draft saves are **not** a strong semantic guarantee.

At draft-update time, the system is intentionally permissive and mainly guarantees that the content is valid JSON. Stronger semantic checks happen later during publish/render-oriented validation paths.

Agents should therefore treat:

- **successful save** → JSON accepted
- **successful render / publish validation** → much stronger confidence

## Migrations

Known format evolution includes:

- `2.2.0` → adds document footer support and shared surface handling for header/footer
- `2.1.0` → adds document header support and header/body image injectable tracking
- `2.0.0` → older documents may omit `header` / `footer`

The import/migration path can normalize old documents. Agents editing existing version content should preserve the current version unless a project-specific migration step is explicitly required.

## Agent Editing Pattern

Use this pattern for safe edits:

1. Read version detail
2. Parse current `contentStructure`
3. Identify the smallest subtree to change
4. Preserve unknown and unrelated fields
5. Update `variableIds` only when needed
6. Save via version update endpoint
7. Render/preview to validate

# Editor Capability Matrix

This is the **authoritative agent-facing matrix** for what `pdf-forge` supports today across:

- the current **body** UI
- the current **header** UI
- the current **footer** UI
- the PortableDoc / `contentStructure` schema
- the Typst renderer
- the subset considered safe for agent automation today

## Status Legend

- **Yes** — supported today
- **Partial** — supported with important restrictions
- **No** — not supported on that surface
- **Caution** — works in some layers, but not documented as a default-safe agent feature

## Text and Structure

| Feature | Body UI | Header UI | Footer UI | PortableDoc / schema | Typst renderer | Agent-safe today | Notes / limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Paragraph | Yes | Yes | Yes | Yes | Yes | **Supported** | Base text block on all surfaces. |
| Heading 1-3 | Yes | Yes | Yes | Yes | Yes | **Supported** | The current editor limits headings to levels 1-3. |
| Bold | Yes | Yes | Yes | Yes | Yes | **Supported** | Safe default. |
| Italic | Yes | Yes | Yes | Yes | Yes | **Supported** | Safe default. |
| Strike | Yes | Yes | Yes | Yes | Yes | **Supported** | Safe default. |
| Underline | No clear toolbar action | No clear toolbar action | No clear toolbar action | Yes | Yes | **Not documented as safe** | Renderer supports it, but the current editing UX does not clearly expose it as a standard operation. |
| Highlight | No clear toolbar action | No clear toolbar action | No clear toolbar action | Yes | Yes | **Not documented as safe** | Renderer supports highlight color, but the current editing UX does not present it as a first-class control. |
| Link | No clear toolbar action | No clear toolbar action | No clear toolbar action | Yes | Yes | **Not documented as safe** | Renderer supports `href`, but this is not documented as a standard editor workflow today. |
| Inline code mark | No clear toolbar action | No clear toolbar action | No clear toolbar action | Yes | Yes | **Not documented as safe** | Exists in schema/renderer, not documented as part of the current editing UX. |
| Code block | No clear toolbar action | No | No | Yes | Yes | **Not documented as safe** | Backend can render it, but it is not part of the documented UI flow today. |
| Blockquote | Yes | Yes | Yes | Yes | Yes | **Supported** | Available on constrained surfaces too. Preserve surrounding surface layout/image rules. |
| Hard break | Partial | Yes | Yes | Yes | Yes | **Supported** | Header/Footer Enter inserts hard break. Body support depends on editor behavior (e.g. standard hard-break flow). |
| Horizontal rule | Yes | Yes | Yes | Yes | Yes | **Supported** | Available on constrained surfaces too. Verify render output when used near surface images. |
| Page break | Partial | No | No | Yes | Yes | **Partially supported / use with caution** | Supported in schema/renderer. Treat as explicit layout control and verify render output. |

## Lists

| Feature | Body UI | Header UI | Footer UI | PortableDoc / schema | Typst renderer | Agent-safe today | Notes / limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Bullet list | Yes | Yes | Yes | Yes | Yes | **Supported** | Supported on body/header/footer surfaces. |
| Ordered list | Yes | Yes | Yes | Yes | Yes | **Supported** | Supported on body/header/footer surfaces. |
| Task list | No clear toolbar action | No | No | Yes | Yes | **Not documented as safe** | Renderer/schema support exists, but it is not a documented default editor workflow. |
| List injector | Yes | No | No | Yes | Yes | **Supported** | Dynamic list driven by injectables. Safer than inventing task list semantics. |

## Styles

| Feature | Body UI | Header UI | Footer UI | PortableDoc / schema | Typst renderer | Agent-safe today | Notes / limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Text color | Yes | Yes | Yes | Yes | Yes | **Supported** | Rendered through `textStyle`. Prefer hex for new manual input, but preserve existing CSS `rgb(...)` / `rgba(...)` values already stored in live content. |
| Font family | Yes | Yes | Yes | Yes | Yes | **Supported** | Uses editor-defined options and Typst font fallbacks. |
| Font size | Yes | Yes | Yes | Yes | Yes | **Supported** | Stored as CSS-like px strings and converted to Typst pt. |
| Text alignment | Yes | Yes | Yes | Yes | Yes | **Supported** | Body applies to headings/paragraphs/table cells; header/footer support text alignment too. |
| Line spacing | Yes | Yes | Yes | Yes | Yes | **Supported** | Preset-based only (`tight`, `compact`, `normal`, `relaxed`, `loose`). Do not invent arbitrary values. |

## Images and Surface Layout

| Feature | Body UI | Header UI | Footer UI | PortableDoc / schema | Typst renderer | Agent-safe today | Notes / limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Body image | Yes | No | No | Yes | Yes | **Supported** | Safe when using documented attrs only. |
| Surface image/logo | No | Yes | Yes | Yes | Yes | **Supported** | Stored in the `header` / `footer` object, not as regular body content. |
| Image via injectable | Yes | Yes | Yes | Yes | Yes | **Supported** | Body/header/footer image injectables are validated against declared `variableIds`. Header/footer image bindings live on `imageInjectableId`. |
| Custom image node | Partial | No | No | Yes | Yes | **Partially supported / use with caution** | Treat as schema-backed image variant; do not invent attrs beyond documented image fields. |
| Inline image wrapping | Partial | No | No | Yes | Yes | **Partially supported / use with caution** | Renderer supports inline/wrap behavior; verify final PDF after edits. |
| Circular image shape | Partial | No | No | Yes | Yes | **Partially supported / use with caution** | Supported in renderer when dimensions are present; verify render output. |
| Surface layout: `image-left` | No | Yes | Yes | Yes | Yes | **Supported** | Header/footer-only layout mode. |
| Surface layout: `image-right` | No | Yes | Yes | Yes | Yes | **Supported** | Header/footer-only layout mode. |
| Surface layout: `image-center` | No | Yes | Yes | Yes | Yes | **Supported** | In center mode, image takes priority over text when an image exists. |

## Dynamic Content and Tables

| Feature | Body UI | Header UI | Footer UI | PortableDoc / schema | Typst renderer | Agent-safe today | Notes / limitations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Injector placeholder | Yes | Yes | Yes | Yes | Yes | **Supported** | Body/header/footer text injectors are supported. `variableIds` is validated against injector nodes on all three surfaces. Inline injector nodes preserve supported text marks/styles such as bold, italic, strike, font family, font size, and color. Surface image injectables remain a separate feature tracked via `imageInjectableId`. |
| Conditional block | Yes | No | No | Yes | Yes | **Supported** | Body-only workflow. Keep `conditions` / `expression` structure intact. |
| Editable table | Yes | No | No | Yes | Yes | **Supported** | Body-only feature. Safe when preserving row/cell structure. |
| Table injector | Yes | No | No | Yes | Yes | **Supported** | Prefer for dynamic tabular data. |
| Table header/body style overrides | Partial | No | No | Yes | Yes | **Partially supported / use with caution** | Supported in renderer/schema; preserve existing attrs rather than inventing new ones casually. |

## Operational Guidance

### Safe defaults for agents

Prefer these for routine MCP automation:

- paragraphs
- headings 1-3
- bold / italic / strike
- text color
- font family / font size
- line spacing presets
- text alignment
- bullet/ordered lists
- blockquote
- horizontal rule
- body images
- header/footer text + surface image layouts
- inline injector placeholders with supported text marks/styles
- conditional blocks
- editable tables
- list injectors / table injectors

### Use with caution

Use only when the request truly needs it and render afterward:

- page breaks
- custom image behaviors
- inline image wrapping
- circular image cropping
- advanced table style overrides

### Not documented as safe by default

Do not introduce these casually in new MCP-generated content unless the project explicitly standardizes them:

- underline
- highlight
- links
- inline code mark
- code blocks
- task lists / task items

Those capabilities exist in some layers of the system, but they are not documented as part of the default-safe editor workflow today.

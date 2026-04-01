# Typst Rendering Boundaries

This document explains what the PortableDoc → Typst pipeline renders today and where agents should be conservative.

## Core Rule

A capability can exist in the renderer without being a good default for agent automation.

Always distinguish:

- renderer capability
- current editor UX
- documented agent-safe subset

## What the Typst Converter Renders Reliably

The current backend converter handles:

- paragraphs and headings
- text marks such as bold, italic, strike
- alignment
- line spacing presets
- blockquote and horizontal rule
- bullet / ordered lists
- injectors and conditionals
- body images and header images
- editable tables
- list injectors and table injectors
- hard breaks
- page breaks

## Marks Rendered by the Backend

The backend has explicit rendering paths for:

- `bold`
- `italic`
- `strike`
- `code`
- `underline`
- `highlight`
- `link`
- `textStyle`

This means the renderer can process them, but agents should still check the capability matrix before introducing marks that are not part of the documented default workflow.

## Text Style Boundaries

### Font size

Font sizes are interpreted from CSS-like px strings and converted to Typst pt.

Approximation used:

- `1px ≈ 0.75pt`

Agents should keep using the documented editor size values and avoid inventing arbitrary units.

### Font family

Font families render through Typst text settings with fallback handling.

The toolbar-configured families include options such as:

- `Inter`
- `Arial, sans-serif`
- `Times New Roman, serif`
- `Georgia, serif`
- `Courier New, monospace`

Prefer those established families for agent-generated content.

### Text color

Text color is rendered through `textStyle` and converted into Typst `rgb(...)` values.

Prefer valid hex-style colors already used by the editor.

## Line Spacing Boundaries

Line spacing is preset-based, not free-form.

Current supported presets:

- `tight`
- `compact`
- `normal`
- `relaxed`
- `loose`

Agents should not invent arbitrary line spacing values.

The renderer maps these presets into Typst `leading` and paragraph spacing rules.

## Alignment Boundaries

Paragraph and heading alignment is rendered through Typst alignment wrappers or paragraph justification.

Documented values include:

- `left`
- `center`
- `right`
- `justify`

Use only those values.

## Image Rendering Boundaries

### Supported image sources

The renderer resolves images from:

- direct local-like paths
- remote `http/https` URLs
- `data:` URLs
- injectable-backed image references
- non-standard schemes resolved by the configured resolver

### Display modes

The image contract supports:

- `block`
- `inline`

`inline` images are special because the renderer can wrap following paragraphs around the image.

That behavior is real, but layout-sensitive. Agents should render to verify after changing it.

### Alignment

Documented image alignment values are:

- `left`
- `center`
- `right`

### Shape

Documented image shapes include:

- `square`
- `circle`

Circular rendering depends on dimensions and results in clipped image markup. Treat it as safe only when existing dimensions are preserved or intentionally controlled.

## Header Rendering Boundaries

The document header is rendered as a dedicated Typst block with specialized layout behavior.

Supported layout modes:

- `image-left`
- `image-right`
- `image-center`

Important behavior:

- in `image-center`, image takes priority over text when an image exists
- header sizing/layout is not the same as body flow
- header image sizing has minimum/maximum constraints derived from page config

Agents should not treat header layout as if it were generic body markup.

## Dynamic Content Boundaries

### Conditional blocks

Conditionals are evaluated before rendering body content. If the condition resolves false, the block is omitted.

Agents should preserve the condition structure exactly when editing existing logic.

### List injectors and table injectors

The renderer supports rich dynamic list/table generation, including style merging between injected values and node attrs.

This is powerful, but agents should prefer:

- preserving existing style attrs
- making minimal, explicit changes
- avoiding undocumented attr invention

## Tables

Both editable tables and table injectors render through dedicated Typst table paths.

Documented safe pattern:

- use editable tables for authored static layout/content
- use table injectors for dynamic structured data

Use caution with complex style overrides unless the project already uses them.

## Supported by Renderer ≠ Default-Safe for Agents

The renderer can handle more than the standard toolbar explicitly exposes.

That does **not** mean agents should freely generate all of those structures in new content.

Use the conservative rule:

- if it is documented as supported in the capability matrix → safe default
- if it is marked caution → render after editing
- if it is not documented as safe → avoid introducing it unless there is a strong reason and project-specific validation

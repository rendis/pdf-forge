---
name: pdf-forge
description: Use when building, extending, or operating pdf-forge through MCP as a multi-tenant PDF template engine powered by Typst
allowed-tools:
  - mcp__pdf-forge__*
---

# pdf-forge

Use this skill when an agent needs to operate `pdf-forge` through MCP instead of asking the user to perform actions in the UI.

This skill is intentionally split into:

- **this file** → the operational entrypoint for agents
- **reference docs** → the authoritative capability and contract references

## Installation

```bash
npx skills add https://github.com/rendis/pdf-forge --skill pdf-forge
```

## What This Skill Is For

Use this skill for tasks such as:

- discovering and calling `pdf-forge` APIs through MCP
- listing templates, versions, injectables, and render endpoints
- reading and updating `contentStructure` safely
- understanding what the editor supports today without reverse-engineering the frontend
- distinguishing between:
  - what the current UI exposes
  - what PortableDoc / `contentStructure` can represent
  - what the Typst renderer actually renders
  - what is safe for agent automation today

## Operating Model for Agents

This is the rule that matters:

> **Do not assume that “TipTap supports it” means “pdf-forge supports it end-to-end.”**

Always separate these layers:

1. **UI support** — what the current body/header editing surfaces expose
2. **PortableDoc support** — what `contentStructure` can legally encode
3. **Typst support** — what the backend converter renders into PDF
4. **Agent-safe support** — what is documented as safe for MCP automation today

If those layers disagree, be conservative.

### Quick Decision Rules

| Situation | Default agent behavior |
| --- | --- |
| UI support = No and Agent-safe = Not documented as safe | Do **not** introduce it in new content. |
| PortableDoc/schema = Yes and Typst = Yes, but Agent-safe = Caution | Preserve existing usage if needed, but avoid inventing new usage casually. |
| UI / PortableDoc / Typst / Agent-safe all align | Safe default for routine MCP automation. |

## MCP Proxy

This project uses [mcp-openapi-proxy](https://github.com/rendis/mcp-openapi-proxy) as the default MCP integration.

- **Repository**: https://github.com/rendis/mcp-openapi-proxy
- **Install**: `go install github.com/rendis/mcp-openapi-proxy/cmd/mcp-openapi-proxy@latest`
- **Repo config**: `.mcp.json` (Claude Code) + `.codex/config.toml` (Codex)
- **Canonical MCP spec**: `core/docs/openapi.yaml`
- **Default server name**: `pdf-forge`
- **Default tool prefix**: `pf`

### MCP Tool Contract

The proxy does **not** register one MCP tool per endpoint. It always exposes exactly 3 tools:

- `pf_list_endpoints`
- `pf_describe_endpoint`
- `pf_call_endpoint`

Recommended workflow:

1. `pf_list_endpoints` → discover candidate endpoints
2. `pf_describe_endpoint` → inspect the exact contract for one `toolName`
3. `pf_call_endpoint` → execute the request with `path/query/headers/cookies/body`

Common `toolName` examples:

- `pf_get_api_v1_content_templates`
- `pf_get_api_v1_content_templates_templateId_all_versions`
- `pf_get_api_v1_content_templates_templateId_versions_versionId`
- `pf_put_api_v1_content_templates_templateId_versions_versionId`
- `pf_post_api_v1_workspace_document_types_code_render`
- `pf_post_api_v1_workspace_templates_versions_versionId_render`

## Multi-tenant Headers

`pdf-forge` is multi-tenant. MCP calls often need contextual headers.

**Panel routes** usually require:

- `X-Tenant-ID`
- `X-Workspace-ID`

**Render routes** require:

- `X-Tenant-Code`
- `X-Workspace-Code`
- `X-Environment` (`dev` or `prod`)

Pass them:

- per request in `pf_call_endpoint.headers`, or
- globally with `MCP_EXTRA_HEADERS`

Dummy auth mode skips JWT validation, but tenant/workspace headers are still required where the route expects them.

## Agent-Safe Editing Rules

When editing a template version through MCP:

1. **Fetch the current version first**.
2. Treat `contentStructure` as the **canonical document contract**.
3. Preserve unknown fields and untouched subtrees.
4. Do **read → modify → write**, never blind overwrite.
5. Validate **body** and **header** separately.
6. Only use features documented as **Supported** or **Partially supported / use with caution**.
7. If a feature is only known to exist in backend/schema but is not documented as agent-safe, do not introduce it casually.
8. Preserve existing style attrs unless the task explicitly changes them. In particular, do not rewrite `textStyle.color` values just because they are not in your preferred format.
9. Do not treat a successful draft save as proof of semantic correctness; render/publish validation is stronger than draft update validation.

## Before Editing a Template Version

Minimum checklist:

1. Read template + version details
2. Inspect the current `contentStructure`
3. Confirm whether the change affects:
   - body content
   - header content
   - header image/layout
   - `variableIds`
   - `pageConfig`
4. Preserve document versioning and unknown metadata
5. Update only the intended subtree/fields
6. Save with the version update endpoint
7. Render or preview to validate the result

### Color Contract for Agents

When editing or reviewing `contentStructure` styles:

- prefer `#RRGGBB` / `#RGB` when introducing a new color manually
- preserve existing `textStyle.color` values if they already exist in live content
- do **not** assume stored documents are hex-only
- expect persisted content to contain CSS color strings such as `rgb(...)` or `rgba(...)`, especially when rich-text styling came from the editor
- if a change touches color-heavy content, render after saving instead of trusting the draft update alone

For the detailed boundary and document-contract guidance, read:

- [portable-document-contract.md](./portable-document-contract.md)
- [typst-rendering-boundaries.md](./typst-rendering-boundaries.md)

## Recommended MCP Workflow

### 1) Discover and inspect endpoints

- `pf_list_endpoints` → find template/version/render operations
- `pf_describe_endpoint` → inspect one contract before calling it

### 2) Read the document version

Typical read flow:

1. list templates
2. get template or all versions
3. get version detail
4. inspect `contentStructure`

### 3) Modify `contentStructure`

- preserve the existing envelope
- update only the relevant body/header/page config subtree
- keep `variableIds` consistent with the content you introduce

### 4) Persist

- call the version update endpoint with the updated `contentStructure`

### 5) Validate by rendering

Use either:

- `POST /api/v1/workspace/templates/versions/{versionId}/render`
- `POST /api/v1/workspace/document-types/{code}/render`

## Important Validation Boundary

Saving a draft version is a **storage checkpoint**, not a full semantic approval step.

- draft update success mainly means the server accepted the JSON payload
- stronger semantic confidence comes from render/publish-oriented validation

Agents should therefore save, then render or otherwise validate before claiming the document is correct.

## Canonical References

Read these before making non-trivial document edits:

- [editor-capability-matrix.md](./editor-capability-matrix.md)
- [portable-document-contract.md](./portable-document-contract.md)
- [typst-rendering-boundaries.md](./typst-rendering-boundaries.md)
- [mcp-editor-workflows.md](./mcp-editor-workflows.md)
- [issue-routing.md](./issue-routing.md)

Also keep these existing references handy when relevant:

- [domain-reference.md](./domain-reference.md)
- [types-reference.md](./types-reference.md)
- [extensions-reference.md](./extensions-reference.md)
- [config-reference.md](./config-reference.md)

## Issue Routing / Escalation

When a user reports a bug, asks for a missing behavior, or requests a new capability, do **not** route the issue by “bug vs feature”.

Route it by **ownership of the change**.

### Suggest `pdf-forge` library repo when the change belongs to core reusable behavior

Typical library-owned areas:

- editor base behavior
- Typst rendering / layout
- PortableDoc / `contentStructure`
- public SDK or extension-point limitations
- generic API behavior
- docs / skill / MCP guidance
- bugs reproducible in a vanilla `pdf-forge` setup

### Suggest the implementation repo when the change belongs to custom project behavior

Typical implementation-owned areas:

- domain-specific injectors
- `WorkspaceInjectableProvider`
- `RequestMapper`
- custom middleware or auth wiring
- external integrations
- business rules
- project-specific configuration or extension code

### Mandatory routing flow

Before suggesting or creating an issue:

1. verify whether the behavior already exists
2. verify whether it is a real bug/gap vs expected custom extensibility
3. classify ownership:
   - core reusable
   - downstream custom
   - ambiguous
4. suggest the target repo
5. only offer issue creation when the destination is clear

### Conservative defaults

- Missing domain injector by default → **implementation repo**
- Generic editor/render/API/PortableDoc bug by default → **`pdf-forge`**
- If the issue only appears with custom project code, assume **implementation repo** until proven otherwise
- If the downstream repo is not known, **do not invent it**

When the implementation repo is unknown, explain the probable owner and ask the user for the target repo/path before creating the issue.

### Issue metadata to prepare

When offering issue creation, prepare at least:

- target repo
- issue type (`bug`, `feature`, `docs`, `enhancement`)
- short title
- observed behavior
- expected behavior
- why this belongs to that repo
- affected layer (`editor`, `render`, `PortableDoc`, `MCP/docs`, `custom injector/provider/mapper`, etc.)
- evidence (paths, endpoint/toolName, logs, screenshots when available)

Use [issue-routing.md](./issue-routing.md) for detailed routing rules, examples, and ambiguous cases.

## Capability Summary (Short Version)

### Supported today for agent workflows

- body text content with headings 1-3
- bold / italic / strike
- text color, font family, font size
- line spacing presets
- text alignment
- bullet and ordered lists
- blockquote and horizontal rule
- body images
- conditional blocks
- editable tables
- table injectors and list injectors
- header text + header image layouts

### Use with caution

- page breaks
- image behaviors that depend on wrapping/layout details
- features supported by renderer/schema but not clearly exposed in the current toolbar/UI

### Not documented as safe by default

- marks/nodes that exist in backend rendering but are not clearly exposed and validated as part of the current editing UX
- any new attrs/structures invented ad hoc by the agent

## Portable Document Reminder

`contentStructure` is not “just editor HTML”. It is a PortableDoc envelope that includes:

- document `version`
- `pageConfig`
- `variableIds`
- body `content`
- optional `header`
- `exportInfo`

That envelope is what the backend validates and renders.

## Editor Surface Reminder

The **body** and **header** are not equivalent surfaces.

- body supports richer structures such as conditionals and tables
- header is intentionally constrained and has dedicated image/layout behavior

Never assume a body-safe operation is automatically header-safe.

## Typst Reminder

The renderer supports more nodes/marks than the current toolbar obviously exposes. That does **not** automatically make them safe defaults for agents.

When in doubt:

- prefer the documented subset
- preserve existing structures
- render to verify

## Spec Generation

`mcp-openapi-proxy` requires **OpenAPI 3.x**. This repo still generates Swagger 2.0 for Swagger UI, and `make swagger` converts it into `core/docs/openapi.yaml` for MCP.

```bash
make swagger
```

If you are working with local, uncommitted API changes, regenerate the spec and temporarily point `MCP_SPEC` to `./core/docs/openapi.yaml`. The committed default config intentionally uses the GitHub raw URL from `main`.

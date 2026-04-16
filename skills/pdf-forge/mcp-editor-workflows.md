# MCP Editor Workflows

This document describes concrete MCP playbooks for operating `pdf-forge` template versions without using the UI.

## Workflow Principles

When editing documents through MCP:

- always inspect the current version first
- treat `contentStructure` as the canonical document payload
- do read → modify → write
- preserve unknown fields and unrelated subtrees
- render after meaningful layout/content changes

## MCP Tools

The default MCP server exposes exactly three tools:

- `pf_list_endpoints`
- `pf_describe_endpoint`
- `pf_call_endpoint`

## Typical Endpoint Discovery Flow

### Discover template/version endpoints

Use `pf_list_endpoints` with a content path prefix, for example:

```json
{
  "q": "template versions",
  "path_prefix": "/api/v1/content"
}
```

Then inspect exact contracts with `pf_describe_endpoint` before writing.

## Workflow 1 — List Templates

Goal: discover candidate templates in a workspace.

Typical `toolName`:

- `pf_get_api_v1_content_templates`

Example call:

```json
{
  "toolName": "pf_get_api_v1_content_templates",
  "headers": {
    "X-Tenant-ID": "<tenant-uuid>",
    "X-Workspace-ID": "<workspace-uuid>"
  }
}
```

## Workflow 2 — Get Template and Versions

Goal: inspect a template and all available versions.

Typical `toolName` values:

- `pf_get_api_v1_content_templates_templateId`
- `pf_get_api_v1_content_templates_templateId_all_versions`

Use these before selecting a version to edit.

## Workflow 3 — Read Version Detail

Goal: retrieve the current `contentStructure`.

Typical `toolName`:

- `pf_get_api_v1_content_templates_templateId_versions_versionId`

Why this matters:

- `contentStructure` is the canonical PortableDoc envelope
- this is the source to modify, not an invented replacement document

## Workflow 4 — Update a Version Safely

Goal: persist a controlled edit to `contentStructure`.

Typical `toolName`:

- `pf_put_api_v1_content_templates_templateId_versions_versionId`

### Safe update strategy

1. Read current version detail
2. Copy the full current `contentStructure`
3. Modify only the intended subtree
4. Preserve:
   - document `version`
   - `pageConfig`
   - unrelated `variableIds`
   - unrelated body/header/footer content
   - unknown fields
5. Send the updated payload back via the version update endpoint

### Important validation note

A successful draft update does **not** mean the document is semantically valid end-to-end.

- draft update success mainly means the JSON payload was accepted
- stronger semantic validation happens later through render/publish-oriented paths

Always render after meaningful document edits.

### Example body shape

```json
{
  "toolName": "pf_put_api_v1_content_templates_templateId_versions_versionId",
  "path": {
    "templateId": "<template-id>",
    "versionId": "<version-id>"
  },
  "headers": {
    "X-Tenant-ID": "<tenant-uuid>",
    "X-Workspace-ID": "<workspace-uuid>"
  },
  "body": {
    "contentStructure": {
      "version": "2.2.0",
      "meta": { "title": "Contract" },
      "pageConfig": { "formatId": "A4", "width": 794, "height": 1123, "margins": { "top": 96, "right": 96, "bottom": 96, "left": 96 } },
      "variableIds": ["customer_name"],
      "content": { "type": "doc", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Hello" }] }] },
      "header": { "enabled": false },
      "footer": { "enabled": false },
      "exportInfo": { "exportedAt": "2026-01-01T00:00:00Z", "sourceApp": "pdf-forge" }
    }
  }
}
```

Do not treat that sample as a schema generator. Read the live version first and preserve its existing shape.

Never start from this sample when editing an existing version; start from the fetched live `contentStructure` and apply a minimal read-modify-write update.

## Workflow 5 — Update Header/Footer Content or Surface Image

Goal: modify a non-body surface without corrupting the rest of the document.

Rules:

- change the `header` / `footer` object, not random body nodes
- preserve `layout`, image dimensions, and existing surface content unless the task explicitly changes them
- if using header/footer image injectables, keep `variableIds` aligned
- remember that `image-center` prioritizes image over text when image exists
- remember that the header renders on the first page and the footer renders on the last page

## Workflow 6 — Render by Version ID

Goal: validate the saved template version.

Typical `toolName`:

- `pf_post_api_v1_workspace_templates_versions_versionId_render`

Required headers usually include:

- `X-Tenant-Code`
- `X-Workspace-Code`
- `X-Environment`

Example:

```json
{
  "toolName": "pf_post_api_v1_workspace_templates_versions_versionId_render",
  "path": {
    "versionId": "<version-id>"
  },
  "headers": {
    "X-Tenant-Code": "<tenant-code>",
    "X-Workspace-Code": "<workspace-code>",
    "X-Environment": "dev"
  },
  "body": {
    "injectables": {
      "customerId": "123"
    }
  }
}
```

### Important renderability boundary

This endpoint does **not** render arbitrary saved versions.

- `PUBLISHED` versions are renderable
- `STAGING` versions are renderable only with `X-Environment: dev`
- `DRAFT`, `SCHEDULED`, and `ARCHIVED` versions are not renderable through this endpoint

If you just edited a `DRAFT` version and need MCP render validation, stage it first and then render it in `dev`.

## Workflow 7 — Render by Document Type

Goal: validate document-type resolution instead of version-specific rendering.

Typical `toolName`:

- `pf_post_api_v1_workspace_document_types_code_render`

Use this when the user cares about the document type contract rather than a single version ID.

Important nuance:

- in `dev`, the default document-type resolver tries `STAGING` first and then falls back to `PUBLISHED`
- this fallback belongs to the default resolver behavior, not to the low-level template-version search API itself

## Practical Editing Playbooks

### A. Replace a paragraph without disturbing the document

1. Read version detail
2. Locate the target node inside `content`
3. Replace only that node or its text leaves
4. Save the full updated envelope
5. Render to validate

### B. Add a new injector-backed image

1. Read version detail
2. Confirm the image variable exists and is accessible
3. Add/update the image node attrs with the correct `injectableId`
4. Ensure `variableIds` includes that variable ID
5. Save and render

### C. Modify header logo layout

1. Read version detail
2. Edit only the `header` object
3. Keep the current header text unless asked otherwise
4. Save and render

### D. Modify footer content or footer image layout

1. Read version detail
2. Edit only the `footer` object
3. Keep the current footer text unless asked otherwise
4. Save and render

### E. Add a table for static content

1. Use an editable `table` when the content is authored and fixed
2. Use a `tableInjector` when the data is dynamic
3. Save and render to verify column widths, fills, and alignment

### F. Add or update a header/footer image injectable safely

1. Read version detail
2. Edit only the target surface `imageInjectableId` / related image fields
3. Ensure `variableIds` includes the header/footer image variable ID
4. Save and render

### G. Add a text variable injector to the header or footer

1. Read version detail
2. Confirm the variable exists and is accessible in the workspace
3. Inside `header.content` or `footer.content`, add an `injector` node with `variableId` set to the variable's key
4. Ensure `variableIds` includes that variable ID
5. Preserve any supported text marks/styles applied to the injector node
6. Save and render

### H. Edit a conditional block or table injector safely

1. Read version detail
2. Preserve the existing conditional/table injector attrs structure
3. Change only the intended fields
4. Keep `variableIds` aligned with any referenced injectables
5. Save and render

### I. Validate a freshly edited DRAFT through MCP

1. Save the updated DRAFT version
2. Stage that version via `POST /api/v1/content/templates/{templateId}/versions/{versionId}/stage` (**ADMIN+**)
3. Render it with `POST /api/v1/workspace/templates/versions/{versionId}/render`
4. Send `X-Environment: dev`
5. If validation should not remain in staging, unstage afterward (`POST .../unstage`, **ADMIN+**)

## What Agents Should Avoid

Avoid these anti-patterns:

- writing a brand new `contentStructure` from scratch when only a small edit is needed
- deleting `variableIds` that are still used elsewhere
- treating header/footer edits as body edits
- inventing attrs or marks not covered by the capability matrix / contract docs
- assuming `textStyle.color` is always hex and rewriting existing CSS `rgb(...)` / `rgba(...)` values without a task-driven reason
- assuming renderer support implies UI-safe or agent-safe support

## Recommended Reading Order

Before non-trivial edits, read in this order:

1. `SKILL.md`
2. `editor-capability-matrix.md`
3. `portable-document-contract.md`
4. `typst-rendering-boundaries.md`
5. `mcp-editor-workflows.md`

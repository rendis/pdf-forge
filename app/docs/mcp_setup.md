# MCP Setup — mcp-openapi-proxy

This guide explains how to configure `pdf-forge` with `mcp-openapi-proxy`, the default MCP integration for this repo.

## What Is `mcp-openapi-proxy`?

`mcp-openapi-proxy` reads an **OpenAPI 3.x** spec and exposes a lightweight MCP navigator/executor surface.

For `pdf-forge`, the default MCP server is:

- **server name**: `pdf-forge`
- **tool prefix**: `pf`

The proxy registers exactly 3 tools:

- `pf_list_endpoints`
- `pf_describe_endpoint`
- `pf_call_endpoint`

It does **not** register one MCP tool per endpoint. Each API operation is represented by a stable `toolName` passed into `pf_describe_endpoint` and `pf_call_endpoint`.

Examples:

- `pf_get_api_v1_content_templates`
- `pf_get_api_v1_content_templates_templateId`
- `pf_post_api_v1_workspace_document_types_code_render`
- `pf_post_api_v1_workspace_templates_versions_versionId_render`

## Canonical Spec

`mcp-openapi-proxy` requires **OpenAPI 3.x**.

This repo still generates Swagger 2.0 for Swagger UI, and `make swagger` now also converts it to:

- `core/docs/openapi.yaml` ← canonical spec for MCP

Default committed MCP config points to the GitHub raw URL:

- `https://raw.githubusercontent.com/rendis/pdf-forge/main/core/docs/openapi.yaml`

That default is intentionally machine-agnostic. If you are working with local, uncommitted API changes, regenerate the spec and temporarily point `MCP_SPEC` to `./core/docs/openapi.yaml`.

## Prerequisites

1. **Go 1.25+**
2. **Install the proxy binary**

   ```bash
   go install github.com/rendis/mcp-openapi-proxy/cmd/mcp-openapi-proxy@latest
   ```

3. **Regenerate specs after API changes**

   ```bash
   make swagger
   ```

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `MCP_SPEC` | OpenAPI 3.x spec URL or local path | `https://raw.githubusercontent.com/rendis/pdf-forge/main/core/docs/openapi.yaml` |
| `MCP_BASE_URL` | Base URL for API calls | `http://localhost:8080` |
| `MCP_TOOL_PREFIX` | Prefix for registered MCP tools and endpoint `toolName` values | `pf` |
| `MCP_AUTH_TOKEN` | Static bearer token fallback | unset |
| `MCP_OIDC_ISSUER` | OIDC issuer URL for protected environments | unset |
| `MCP_OIDC_CLIENT_ID` | OIDC client ID | unset |
| `MCP_EXTRA_HEADERS` | Comma-separated headers applied to every request | unset |

## Configuration by Agent

### Claude Code

The repo includes a versioned [`.mcp.json`](../../.mcp.json), so Claude Code can auto-detect the MCP server when the project is opened.

Verify:

```bash
claude mcp list
claude mcp get pdf-forge
```

### OpenAI Codex

The repo includes a versioned [`../../.codex/config.toml`](../../.codex/config.toml) with a project-local MCP entry:

```toml
[mcp_servers.pdf-forge]
command = "mcp-openapi-proxy"
args = []

[mcp_servers.pdf-forge.env]
MCP_SPEC = "https://raw.githubusercontent.com/rendis/pdf-forge/main/core/docs/openapi.yaml"
MCP_BASE_URL = "http://localhost:8080"
MCP_TOOL_PREFIX = "pf"
```

If you prefer a global Codex config instead:

```bash
codex mcp add pdf-forge --command mcp-openapi-proxy \
  --env MCP_SPEC=https://raw.githubusercontent.com/rendis/pdf-forge/main/core/docs/openapi.yaml \
  --env MCP_BASE_URL=http://localhost:8080 \
  --env MCP_TOOL_PREFIX=pf
```

### Gemini CLI

Edit `~/.gemini/settings.json` (global) or `.gemini/settings.json` (project):

```json
{
  "mcpServers": {
    "pdf-forge": {
      "command": "mcp-openapi-proxy",
      "args": [],
      "env": {
        "MCP_SPEC": "https://raw.githubusercontent.com/rendis/pdf-forge/main/core/docs/openapi.yaml",
        "MCP_BASE_URL": "http://localhost:8080",
        "MCP_TOOL_PREFIX": "pf"
      }
    }
  }
}
```

## Multi-tenant Headers

This is the part people usually miss: the proxy can call the API just fine, but `pdf-forge` is multi-tenant, so many routes require contextual headers.

### Panel routes

Usually require:

- `X-Tenant-ID`
- `X-Workspace-ID`

### Render routes

Require:

- `X-Tenant-Code`
- `X-Workspace-Code`
- `X-Environment` (`dev` or `prod`)

You can pass them:

- per request in `pf_call_endpoint.headers`
- globally via `MCP_EXTRA_HEADERS`

Example:

```json
{
  "toolName": "pf_get_api_v1_content_templates",
  "headers": {
    "X-Tenant-ID": "<tenant-uuid>",
    "X-Workspace-ID": "<workspace-uuid>"
  }
}
```

## Authentication

### Development (dummy auth)

In dummy mode, JWT validation is bypassed, so you usually do **not** need `MCP_AUTH_TOKEN`.

Run the backend in dev dummy mode:

```bash
make dev DUMMY=1
```

or omit the `auth` section in `core/settings/app.yaml`.

### OIDC (production)

For protected environments:

```bash
mcp-openapi-proxy login pdf-forge
mcp-openapi-proxy status
mcp-openapi-proxy logout
```

If you want Codex to read the repo-local config explicitly:

```bash
mcp-openapi-proxy login --codex-config ./.codex/config.toml --server pdf-forge
```

## Recommended Agent Workflow

1. Call `pf_list_endpoints`
2. Pick the endpoint `toolName`
3. Call `pf_describe_endpoint` if you need the exact contract
4. Call `pf_call_endpoint`

If the task involves editing template documents or `contentStructure`, do not stop at the generic MCP setup. Continue with:

- [`../../skills/pdf-forge/SKILL.md`](../../skills/pdf-forge/SKILL.md)
- [`../../skills/pdf-forge/editor-capability-matrix.md`](../../skills/pdf-forge/editor-capability-matrix.md)
- [`../../skills/pdf-forge/portable-document-contract.md`](../../skills/pdf-forge/portable-document-contract.md)
- [`../../skills/pdf-forge/typst-rendering-boundaries.md`](../../skills/pdf-forge/typst-rendering-boundaries.md)
- [`../../skills/pdf-forge/mcp-editor-workflows.md`](../../skills/pdf-forge/mcp-editor-workflows.md)

Those references are the authoritative source for what agents can safely edit today.

Example discovery flow:

```json
{ "q": "templates", "path_prefix": "/api/v1/content" }
```

Example call:

```json
{
  "toolName": "pf_get_api_v1_content_templates",
  "headers": {
    "X-Tenant-ID": "<tenant-uuid>",
    "X-Workspace-ID": "<workspace-uuid>"
  },
  "query": {
    "page": 1,
    "perPage": 20
  }
}
```

## Troubleshooting

### Binary Not Found

1. Verify the binary is in `PATH`:

   ```bash
   which mcp-openapi-proxy
   ```

2. If missing, install it:

   ```bash
   go install github.com/rendis/mcp-openapi-proxy/cmd/mcp-openapi-proxy@latest
   ```

### Spec Not Loading

1. Check the raw URL:

   ```bash
   curl -I https://raw.githubusercontent.com/rendis/pdf-forge/main/core/docs/openapi.yaml
   ```

2. Or verify the local file:

   ```bash
   ls -la core/docs/openapi.yaml
   ```

3. Regenerate if needed:

   ```bash
   make swagger
   ```

### Calls Failing With 401 / 403

1. In dummy mode, make sure the backend is actually running without OIDC
2. In OIDC mode, run:

   ```bash
   mcp-openapi-proxy status
   ```

3. Verify required tenant/workspace headers are present

### Calls Hitting the Wrong Contract

The committed default MCP config uses the raw GitHub spec from `main`. If you're working on local API changes, regenerate the local spec and temporarily override `MCP_SPEC=./core/docs/openapi.yaml`.

## References

- [mcp-openapi-proxy](https://github.com/rendis/mcp-openapi-proxy)
- [Claude Code MCP Docs](https://code.claude.com/docs/en/mcp)
- [OpenAI Codex MCP](https://developers.openai.com/codex/mcp/)
- [Gemini CLI MCP](https://geminicli.com/docs/tools/mcp-server/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

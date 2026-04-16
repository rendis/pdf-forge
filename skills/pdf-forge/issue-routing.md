# Issue Routing Guidance

Use this guide when a user reports a bug, asks for a missing behavior, or wants a new capability added.

The key rule is:

> Route by **ownership of the change**, not by “bug vs feature”.

## Routing Model

### File in `pdf-forge` when the change belongs to the reusable library

Typical `pdf-forge` ownership:

- editor base behavior
- Typst rendering / layout
- PortableDoc / `contentStructure`
- public SDK
- extension-point limitations in the framework
- generic API behavior
- built-in reusable behavior
- docs / skill / MCP guidance
- issues reproducible in a vanilla `pdf-forge` setup

### File in the implementation repo when the change belongs to the consuming project

Typical implementation ownership:

- domain-specific injectors
- `WorkspaceInjectableProvider`
- `RequestMapper`
- custom template resolver
- custom middleware
- custom auth wiring
- external integrations
- project-specific business rules
- project-specific configuration
- behavior implemented in downstream extension code

## Decision Table

| Situation | Suggested repo |
| --- | --- |
| Core editor/render/API/PortableDoc/SDK/docs issue | `pdf-forge` library repo |
| Generic framework capability missing from extension points | `pdf-forge` library repo |
| Domain-specific injector/provider/mapper/auth/business logic request | implementation repo |
| Problem only appears with custom project code | implementation repo by default |
| Ambiguous case | classify ownership first; do not guess |

## Routing Flow

Before suggesting issue creation:

1. verify whether the behavior already exists
2. verify whether it is a real bug/gap vs expected custom extensibility
3. classify ownership:
   - core reusable
   - downstream custom
   - ambiguous
4. suggest the correct repo
5. only offer issue creation when the target repo is clear

## Conservative Defaults

### Missing injector for domain-specific data

Default target: **implementation repo**

Example:

- “We need an injector to fetch account balance from our domain service.”

This belongs downstream unless the real problem is that `pdf-forge` lacks a generic extension-point capability required to implement it.

### Generic editor/render/layout problem

Default target: **`pdf-forge`**

Examples:

- margins behave incorrectly
- header/footer surface layout renders incorrectly
- render-by-version / staging behavior is incorrect or documented incorrectly
- PortableDoc validation behaves incorrectly
- skill or MCP guidance is misleading

### Custom-code-only failure

Default target: **implementation repo**

If the issue only appears with custom providers, mappers, auth wiring, integrations, or project-specific logic, do not default to `pdf-forge` unless the framework is proven to be the limiting factor.

## Ambiguous Cases

### Case 1 — downstream request vs framework limitation

Example:

- “We need an injector for X.”

Ask:

- is X domain-specific or generic?
- can this be implemented entirely in custom extension code?
- does the request require a new SDK / extension-point capability?

Default:

- domain-specific → implementation repo
- generic framework limitation → `pdf-forge`

### Case 2 — bug observed in a consumer project

Example:

- auth, mapper, provider, custom resolver, or middleware behavior is wrong

Default:

- if the issue depends on custom project code, assume implementation ownership until proven otherwise
- only escalate to `pdf-forge` when the bug is reproducible without the downstream customization or clearly points to a framework limitation

### Case 3 — implementation repo unknown

If the current workspace is the `pdf-forge` library repo and the downstream implementation repo is not identified:

- explain the likely owner
- offer to draft the issue
- do **not** create it in `pdf-forge` just because that is the current repo

Recommended wording:

> “This looks implementation-specific rather than a `pdf-forge` core issue. If you want, I can help draft the issue, but I need the target implementation repo/path first.”

## Suggested Issue Metadata

Before offering issue creation, gather at least:

- target repo
- issue type: `bug`, `feature`, `docs`, or `enhancement`
- short title
- observed behavior
- expected behavior
- why the issue belongs to that repo
- affected layer:
  - editor
  - render
  - PortableDoc
  - MCP/docs
  - template resolution
  - custom injector/provider/mapper
  - auth/middleware
- evidence:
  - paths
  - endpoint/toolName
  - logs
  - screenshots

If the downstream repo is unknown, explicitly mark that the probable owner is implementation but the target repo is still missing.

## Examples

### Route to `pdf-forge`

- “Margins behave strangely across rendered PDFs.”
- “The header/footer surface layout is incorrect in the core editor/render pipeline.”
- “Render-by-version rejects my draft, but the docs/skill imply that any saved version should render.”
- “The skill documents an MCP call incorrectly.”
- “The framework does not expose a generic extension point needed for a reusable integration.”

### Route to implementation repo

- “We need an injector for our internal SAP customer balance.”
- “Our custom `RequestMapper` does not transform the payload the way our business flow needs.”
- “Our custom `WorkspaceInjectableProvider` is not returning the expected domain fields.”
- “Our custom template resolver chooses the wrong version for our business rules.”
- “Our custom API-key auth flow fails in the consuming service.”

## Final Rule

If the fix belongs to the reusable framework, route it to `pdf-forge`.

If it belongs to domain logic, integration, or downstream customization, route it to the implementation repo.

If the owner is unclear, say so explicitly before suggesting issue creation.

package port

import (
	"context"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
)

// TemplateResolverRequest is the context passed to custom template resolvers.
// It contains the original render request data so the resolver can make
// informed decisions about which template version to use.
type TemplateResolverRequest struct {
	// TenantCode is the tenant code from the render request (X-Tenant-Code header).
	TenantCode string
	// WorkspaceCode is the workspace code from the render request (X-Workspace-Code header).
	WorkspaceCode string
	// DocumentType is the document type code from the URL path.
	DocumentType string
	// Headers contains the HTTP headers from the original render request.
	Headers map[string]string
	// RawBody is the unparsed HTTP request body.
	RawBody []byte
	// Injectables contains pre-resolved injectable values available at resolution time.
	Injectables map[string]any
	// Environment is the render environment from the X-Environment header ("dev" or "prod").
	// Use Environment.IsDev() to decide whether to search for STAGING or PUBLISHED versions.
	Environment entity.Environment
}

// TemplateResolver allows custom template version selection before default fallback.
type TemplateResolver interface {
	// Resolve returns:
	//   - non-nil version ID: use this version
	//   - nil version ID: use default resolver fallback
	//   - error: abort request
	Resolve(ctx context.Context, req *TemplateResolverRequest, adapter TemplateVersionSearchAdapter) (*string, error)
}

// TemplateVersionSearchAdapter exposes read-only template version search for custom resolvers.
type TemplateVersionSearchAdapter interface {
	SearchTemplateVersions(ctx context.Context, params TemplateVersionSearchParams) ([]TemplateVersionSearchItem, error)
}

// TemplateVersionSearchParams filters the read-only template version search.
//
// The Staging and Published fields control which version statuses are returned.
// Staging takes precedence: when *Staging is true, Published is ignored.
//
// Behavior table:
//
//	Staging     | Published   | Result
//	------------|-------------|-----------------------------------
//	nil / false | nil / true  | Only PUBLISHED versions (default)
//	true        | (ignored)   | Only STAGING versions
//	false       | false       | Only DRAFT versions
//
// Note: there is no automatic fallback from STAGING to PUBLISHED.
// To implement a staging-with-fallback strategy, perform two separate
// searches — first with Staging=true, then with Published=true.
type TemplateVersionSearchParams struct {
	// TenantCode is required. Limits results to this tenant.
	TenantCode string
	// WorkspaceCodes limits results to these workspaces. Searched in order,
	// results are aggregated across all matching workspaces.
	WorkspaceCodes []string
	// DocumentType is required. Limits results to this document type code.
	DocumentType string
	// Published filters by PUBLISHED status. Defaults to true when nil.
	// Only evaluated when Staging is nil or false.
	Published *bool
	// Staging filters by STAGING status. Defaults to false when nil.
	// When true, takes precedence over Published (Published is ignored).
	Staging *bool
}

// TemplateVersionSearchItem is one candidate returned by SearchTemplateVersions.
type TemplateVersionSearchItem struct {
	// Published is true when the matched version has PUBLISHED status.
	Published bool
	// TenantCode is the tenant that owns this version.
	TenantCode string
	// WorkspaceCode is the workspace that owns this version.
	WorkspaceCode string
	// VersionID is the UUID of the matched template version.
	// This value can be returned directly from Resolve() to select this version.
	VersionID string
}

package template

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/port"
)

const (
	systemTenantCode    = "SYS"
	systemWorkspaceCode = "SYS_WRKSP"
)

// DefaultTemplateResolver resolves template versions by deterministic fallback.
type DefaultTemplateResolver struct{}

// NewDefaultTemplateResolver creates a new default resolver instance.
func NewDefaultTemplateResolver() port.TemplateResolver {
	return &DefaultTemplateResolver{}
}

// Resolve applies tenant/workspace/documentType fallback and requires a published version.
//
// Fallback chain:
//  1. Tenant + exact workspace from request + tenant's system workspace
//  2. SYS tenant + SYS_WRKSP (global system)
func (r *DefaultTemplateResolver) Resolve(
	ctx context.Context,
	req *port.TemplateResolverRequest,
	adapter port.TemplateVersionSearchAdapter,
) (*string, error) {
	if req == nil {
		return nil, fmt.Errorf("template resolver request is nil")
	}

	fallbacks := []struct {
		tenantCode                   string
		workspaceCodes               []string
		includeTenantSystemWorkspace bool
		stage                        string
	}{
		{
			tenantCode:                   req.TenantCode,
			workspaceCodes:               []string{req.WorkspaceCode},
			includeTenantSystemWorkspace: true,
			stage:                        "tenant_workspace",
		},
		{
			tenantCode:     systemTenantCode,
			workspaceCodes: []string{systemWorkspaceCode},
			stage:          "system_system_workspace",
		},
	}

	for _, step := range fallbacks {
		if vID, err := r.resolveAtStage(ctx, req, adapter, step.tenantCode, step.workspaceCodes, step.includeTenantSystemWorkspace, step.stage); err != nil {
			return nil, err
		} else if vID != nil {
			return vID, nil
		}
	}

	return nil, entity.ErrTemplateNotResolved
}

func (r *DefaultTemplateResolver) resolveAtStage(
	ctx context.Context,
	req *port.TemplateResolverRequest,
	adapter port.TemplateVersionSearchAdapter,
	tenantCode string, workspaceCodes []string, includeTenantSys bool, stage string,
) (*string, error) {
	// In dev environment: try staging version first
	if req.Environment.IsDev() {
		staging := true
		if vID, err := r.searchVersion(ctx, adapter, tenantCode, workspaceCodes, req.DocumentType, &staging, nil, includeTenantSys, stage+" (staging)"); err != nil {
			return nil, err
		} else if vID != nil {
			return vID, nil
		}
	}

	// Published lookup (existing behavior)
	published := true
	return r.searchVersion(ctx, adapter, tenantCode, workspaceCodes, req.DocumentType, nil, &published, includeTenantSys, stage)
}

func (r *DefaultTemplateResolver) searchVersion(
	ctx context.Context,
	adapter port.TemplateVersionSearchAdapter,
	tenantCode string, workspaceCodes []string, documentType string,
	staging, published *bool, includeTenantSys bool, stage string,
) (*string, error) {
	items, err := adapter.SearchTemplateVersions(ctx, port.TemplateVersionSearchParams{
		TenantCode:                   tenantCode,
		WorkspaceCodes:               workspaceCodes,
		DocumentType:                 documentType,
		Published:                    published,
		Staging:                      staging,
		IncludeTenantSystemWorkspace: includeTenantSys,
	})
	if err != nil {
		return nil, fmt.Errorf("default template resolution failed at stage %s: %w", stage, err)
	}
	if len(items) > 0 {
		versionID := items[0].VersionID
		slog.InfoContext(ctx, "default template resolver hit",
			"stage", stage,
			"tenantCode", tenantCode,
			"workspaceCode", items[0].WorkspaceCode,
			"documentType", documentType,
			"templateVersionID", versionID,
		)
		return &versionID, nil
	}

	slog.DebugContext(ctx, "default template resolver stage miss",
		"stage", stage,
		"tenantCode", tenantCode,
		"documentType", documentType,
	)
	return nil, nil
}

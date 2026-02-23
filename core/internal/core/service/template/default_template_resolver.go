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
func (r *DefaultTemplateResolver) Resolve(
	ctx context.Context,
	req *port.TemplateResolverRequest,
	adapter port.TemplateVersionSearchAdapter,
) (*string, error) {
	if req == nil {
		return nil, fmt.Errorf("template resolver request is nil")
	}

	published := true
	fallbacks := []struct {
		tenantCode     string
		workspaceCodes []string
		stage          string
	}{
		{tenantCode: req.TenantCode, workspaceCodes: []string{req.WorkspaceCode}, stage: "tenant_workspace"},
		{tenantCode: req.TenantCode, workspaceCodes: []string{systemWorkspaceCode}, stage: "tenant_system_workspace"},
		{tenantCode: systemTenantCode, workspaceCodes: []string{systemWorkspaceCode}, stage: "system_system_workspace"},
	}

	for _, step := range fallbacks {
		items, err := adapter.SearchTemplateVersions(ctx, port.TemplateVersionSearchParams{
			TenantCode:     step.tenantCode,
			WorkspaceCodes: step.workspaceCodes,
			DocumentType:   req.DocumentType,
			Published:      &published,
		})
		if err != nil {
			return nil, fmt.Errorf("default template resolution failed at stage %s: %w", step.stage, err)
		}
		if len(items) == 0 {
			slog.DebugContext(ctx, "default template resolver stage miss",
				"stage", step.stage,
				"tenantCode", step.tenantCode,
				"workspaceCode", step.workspaceCodes[0],
				"documentType", req.DocumentType,
			)
			continue
		}

		versionID := items[0].VersionID
		slog.InfoContext(ctx, "default template resolver hit",
			"stage", step.stage,
			"tenantCode", step.tenantCode,
			"workspaceCode", step.workspaceCodes[0],
			"documentType", req.DocumentType,
			"templateVersionID", versionID,
		)
		return &versionID, nil
	}

	return nil, entity.ErrTemplateNotResolved
}

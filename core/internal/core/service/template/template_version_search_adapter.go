package template

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/rendis/pdf-forge/core/internal/core/entity"
	"github.com/rendis/pdf-forge/core/internal/core/port"
)

// TemplateVersionSearchAdapter provides read-only template version search for custom resolvers.
type TemplateVersionSearchAdapter struct {
	tenantRepo    templateResolverTenantRepository
	workspaceRepo templateResolverWorkspaceRepository
	docTypeRepo   templateResolverDocumentTypeRepository
	templateRepo  templateResolverTemplateRepository
	versionRepo   templateResolverTemplateVersionRepository
}

// NewTemplateVersionSearchAdapter builds a new read-only search adapter.
func NewTemplateVersionSearchAdapter(
	tenantRepo port.TenantRepository,
	workspaceRepo port.WorkspaceRepository,
	docTypeRepo port.DocumentTypeRepository,
	templateRepo port.TemplateRepository,
	versionRepo port.TemplateVersionRepository,
) port.TemplateVersionSearchAdapter {
	return &TemplateVersionSearchAdapter{
		tenantRepo:    tenantRepo,
		workspaceRepo: workspaceRepo,
		docTypeRepo:   docTypeRepo,
		templateRepo:  templateRepo,
		versionRepo:   versionRepo,
	}
}

// SearchTemplateVersions returns deterministic candidates by tenant/workspace/document type.
func (a *TemplateVersionSearchAdapter) SearchTemplateVersions(ctx context.Context, params port.TemplateVersionSearchParams) ([]port.TemplateVersionSearchItem, error) {
	if strings.TrimSpace(params.TenantCode) == "" {
		return nil, fmt.Errorf("tenantCode is required")
	}
	if len(params.WorkspaceCodes) == 0 {
		return nil, fmt.Errorf("workspaceCodes is required")
	}
	if strings.TrimSpace(params.DocumentType) == "" {
		return nil, fmt.Errorf("documentType is required")
	}

	tenant, err := a.tenantRepo.FindByCode(ctx, strings.ToUpper(strings.TrimSpace(params.TenantCode)))
	if err != nil {
		if errors.Is(err, entity.ErrTenantNotFound) {
			return []port.TemplateVersionSearchItem{}, nil
		}
		return nil, fmt.Errorf("finding tenant by code: %w", err)
	}

	docType, err := a.docTypeRepo.FindByCodeWithGlobalFallback(ctx, tenant.ID, strings.ToUpper(strings.TrimSpace(params.DocumentType)))
	if err != nil {
		if errors.Is(err, entity.ErrDocumentTypeNotFound) {
			return []port.TemplateVersionSearchItem{}, nil
		}
		return nil, fmt.Errorf("finding document type by code: %w", err)
	}

	wantPublished := true
	if params.Published != nil {
		wantPublished = *params.Published
	}

	results := make([]port.TemplateVersionSearchItem, 0, len(params.WorkspaceCodes))
	for _, workspaceCode := range params.WorkspaceCodes {
		workspaceCode = strings.ToUpper(strings.TrimSpace(workspaceCode))
		workspace, err := a.workspaceRepo.FindByCodeAndTenant(ctx, tenant.ID, workspaceCode)
		if err != nil {
			if errors.Is(err, entity.ErrWorkspaceNotFound) {
				continue
			}
			return nil, fmt.Errorf("finding workspace by code: %w", err)
		}

		tmpl, err := a.templateRepo.FindByDocumentType(ctx, workspace.ID, docType.ID)
		if err != nil {
			return nil, fmt.Errorf("finding template by document type: %w", err)
		}
		if tmpl == nil {
			continue
		}

		if wantPublished {
			version, err := a.versionRepo.FindPublishedByTemplateIDWithDetails(ctx, tmpl.ID)
			if err != nil {
				if errors.Is(err, entity.ErrVersionNotFound) || errors.Is(err, entity.ErrNoPublishedVersion) {
					continue
				}
				return nil, fmt.Errorf("finding published version: %w", err)
			}
			results = append(results, port.TemplateVersionSearchItem{
				Published:     true,
				TenantCode:    tenant.Code,
				WorkspaceCode: workspace.Code,
				VersionID:     version.ID,
			})
			continue
		}

		versions, err := a.versionRepo.FindByTemplateID(ctx, tmpl.ID)
		if err != nil {
			return nil, fmt.Errorf("finding versions by template: %w", err)
		}
		for _, version := range versions {
			if version.IsPublished() {
				continue
			}
			results = append(results, port.TemplateVersionSearchItem{
				Published:     false,
				TenantCode:    tenant.Code,
				WorkspaceCode: workspace.Code,
				VersionID:     version.ID,
			})
		}
	}

	return results, nil
}
